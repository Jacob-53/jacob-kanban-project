# app/crud/time_tracking.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text
from datetime import datetime, timedelta
from app.models.task import Task
from app.models.user import User
from app.models.task_history import TaskHistory
from app.models.stage_config import StageConfig
from typing import List, Optional

def check_delayed_tasks(db: Session, threshold_percentage: float = 100.0):
    """
    현재 진행 중인 태스크 중 예상 시간을 초과한 태스크를 찾습니다.
    threshold_percentage: 지연으로 간주할 기준 비율 (기본값: 100% = 정확히 예상 시간)
    """
    now = datetime.utcnow()
    
    # 완료되지 않은 태스크 중 current_stage_started_at이 설정된 태스크 조회
    tasks = db.query(Task).filter(
        Task.completed_at.is_(None),
        Task.current_stage_started_at.isnot(None)
    ).all()
    
    delayed_tasks = []
    for task in tasks:
        # 경과 시간 계산 (분 단위)
        if task.current_stage_started_at:
            elapsed_seconds = (now - task.current_stage_started_at).total_seconds()
            elapsed_minutes = float(elapsed_seconds / 60)  # 명시적으로 float 변환
            
            # 현재 단계의 예상 시간 조회
            stage_config = db.query(StageConfig).filter(
                StageConfig.task_id == task.id,
                StageConfig.stage == task.stage
            ).first()
            
            expected_minutes = stage_config.expected_time if stage_config else task.expected_time
            
            # 예상 시간 대비 경과 시간 비율 계산
            if expected_minutes > 0:
                delay_percentage = float((elapsed_minutes / expected_minutes) * 100)  # 명시적으로 float 변환
                
                # 지연 여부 결정
                is_delayed = delay_percentage >= threshold_percentage
                
                # 태스크 지연 상태 업데이트
                if task.is_delayed != is_delayed:
                    task.is_delayed = is_delayed
                    db.commit()
                
                # 지연된 태스크만 결과에 추가
                if is_delayed:
                    # 사용자 정보 조회
                    user = db.query(User).filter(User.id == task.user_id).first()
                    
                    delayed_tasks.append({
                        "task_id": task.id,
                        "title": task.title,
                        "user_id": task.user_id,
                        "username": user.username if user else "Unknown",
                        "current_stage": task.stage,
                        "expected_time": expected_minutes,
                        "elapsed_time": float(elapsed_minutes),  # 명시적으로 float 변환
                        "delay_percentage": float(delay_percentage),  # 명시적으로 float 변환
                        "started_at": task.current_stage_started_at,
                        "is_delayed": is_delayed
                    })
    
    return delayed_tasks

def get_delayed_tasks(db: Session, user_id: Optional[int] = None):
    """
    지연된 태스크 목록을 조회합니다.
    user_id가 제공되면 특정 사용자의 지연된 태스크만 조회합니다.
    """
    query = db.query(Task).filter(Task.is_delayed == True)
    
    if user_id:
        query = query.filter(Task.user_id == user_id)
    
    tasks = query.all()
    
    result = []
    for task in tasks:
        # 경과 시간 계산 (분 단위)
        elapsed_minutes = 0
        if task.current_stage_started_at:
            elapsed_seconds = (datetime.utcnow() - task.current_stage_started_at).total_seconds()
            elapsed_minutes = elapsed_seconds / 60
        
        # 예상 시간 조회
        stage_config = db.query(StageConfig).filter(
            StageConfig.task_id == task.id,
            StageConfig.stage == task.stage
        ).first()
        
        expected_minutes = stage_config.expected_time if stage_config else task.expected_time
        
        # 지연 비율 계산
        delay_percentage = 0
        if expected_minutes > 0:
            delay_percentage = (elapsed_minutes / expected_minutes) * 100
        
        # 사용자 정보 조회
        user = db.query(User).filter(User.id == task.user_id).first()
        
        result.append({
            "task_id": task.id,
            "title": task.title,
            "user_id": task.user_id,
            "username": user.username if user else "Unknown",
            "current_stage": task.stage,
            "expected_time": expected_minutes,
            "elapsed_time": float(elapsed_minutes),
            "delay_percentage": float(delay_percentage),
            "started_at": task.current_stage_started_at,
            "is_delayed": task.is_delayed
        })
    
    return result

def get_task_time_statistics(db: Session, task_id: int):
    """
    특정 태스크의 단계별 소요 시간 통계를 조회합니다.
    """
    # 태스크 조회
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    
    # 단계 이동 이력 조회
    histories = db.query(TaskHistory).filter(
        TaskHistory.task_id == task_id
    ).order_by(TaskHistory.changed_at).all()
    
    # 단계별 설정 조회
    stage_configs = db.query(StageConfig).filter(
        StageConfig.task_id == task_id
    ).all()
    
    # 단계별 예상 시간 맵
    expected_times = {}
    for config in stage_configs:
        expected_times[config.stage] = config.expected_time
    
    # 단계별 실제 소요 시간 계산
    stage_statistics = {}
    
    for i, history in enumerate(histories):
        stage = history.previous_stage
        if not stage or history.time_spent is None:
            continue
        
        # 해당 단계 통계 초기화
        if stage not in stage_statistics:
            stage_statistics[stage] = {
                "expected_time": expected_times.get(stage, task.expected_time),
                "actual_time": 0
            }
        
        # 소요 시간 추가 (초 -> 분 변환)
        stage_statistics[stage]["actual_time"] += history.time_spent / 60
    
    # 마지막 단계 처리 (아직 완료되지 않은 경우)
    if task.current_stage_started_at and not task.completed_at:
        current_stage = task.stage
        elapsed_seconds = (datetime.utcnow() - task.current_stage_started_at).total_seconds()
        
        # 해당 단계 통계 초기화
        if current_stage not in stage_statistics:
            stage_statistics[current_stage] = {
                "expected_time": expected_times.get(current_stage, task.expected_time),
                "actual_time": 0
            }
        
        # 현재까지 소요 시간 추가 (초 -> 분 변환)
        stage_statistics[current_stage]["actual_time"] += elapsed_seconds / 60
    
    # 효율성 계산
    result = []
    for stage, stats in stage_statistics.items():
        expected_time = stats["expected_time"]
        actual_time = stats["actual_time"]
        
        # 효율성 = 예상 시간 / 실제 시간 (1.0 = 정확히 예상대로, <1.0 = 초과, >1.0 = 단축)
        efficiency = expected_time / actual_time if actual_time > 0 else 1.0
        
        result.append({
            "task_id": task_id,
            "title": task.title,
            "stage": stage,
            "expected_time": expected_time,
            "actual_time": actual_time,
            "efficiency": efficiency
        })
    
    return result

def get_user_time_statistics(db: Session, user_id: int):
    """
    특정 사용자의 태스크 수행 시간 통계를 조회합니다.
    """
    # 사용자 조회
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    
    # 완료된 태스크 조회
    completed_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.completed_at.isnot(None)
    ).all()
    
    # 통계 초기화
    total_expected_time = 0
    total_actual_time = 0
    stage_statistics = {}
    
    for task in completed_tasks:
        # 태스크별 통계 조회
        task_stats = get_task_time_statistics(db, task.id)
        
        if not task_stats:
            continue
        
        # 전체 통계에 합산
        for stat in task_stats:
            stage = stat["stage"]
            expected_time = stat["expected_time"]
            actual_time = stat["actual_time"]
            
            total_expected_time += expected_time
            total_actual_time += actual_time
            
            # 단계별 통계 합산
            if stage not in stage_statistics:
                stage_statistics[stage] = {
                    "expected_time": 0,
                    "actual_time": 0
                }
            
            stage_statistics[stage]["expected_time"] += expected_time
            stage_statistics[stage]["actual_time"] += actual_time
    
    # 평균 효율성 계산
    average_efficiency = total_expected_time / total_actual_time if total_actual_time > 0 else 1.0
    
    # 단계별 효율성 계산
    stage_stats_result = {}
    for stage, stats in stage_statistics.items():
        expected_time = stats["expected_time"]
        actual_time = stats["actual_time"]
        efficiency = expected_time / actual_time if actual_time > 0 else 1.0
        
        stage_stats_result[stage] = {
            "stage": stage,
            "expected_time": expected_time,
            "actual_time": actual_time,
            "efficiency": efficiency
        }
    
    return {
        "user_id": user_id,
        "username": user.username,
        "completed_tasks": len(completed_tasks),
        "total_expected_time": total_expected_time,
        "total_actual_time": total_actual_time,
        "average_efficiency": average_efficiency,
        "stage_statistics": stage_stats_result
    }