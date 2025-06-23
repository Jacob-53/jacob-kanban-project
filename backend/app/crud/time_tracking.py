# app/crud/time_tracking.py (수정됨)

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text
from datetime import datetime, timedelta
from app.models.task import Task
from app.models.user import User
# ✅ 모델 임포트 수정 (존재하지 않을 수 있음)
try:
    from app.models.task_history import TaskHistory
    TASK_HISTORY_AVAILABLE = True
except ImportError:
    TASK_HISTORY_AVAILABLE = False
    print("⚠️ TaskHistory 모델을 찾을 수 없습니다. 일부 기능이 제한됩니다.")

try:
    from app.models.stage_config import StageConfig
    STAGE_CONFIG_AVAILABLE = True
except ImportError:
    STAGE_CONFIG_AVAILABLE = False
    print("⚠️ StageConfig 모델을 찾을 수 없습니다. 기본 예상 시간을 사용합니다.")

from typing import List, Optional

def check_delayed_tasks(db: Session, threshold_percentage: float = 100.0):
    """
    현재 진행 중인 태스크 중 예상 시간을 초과한 태스크를 찾습니다.
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
            elapsed_minutes = float(elapsed_seconds / 60)
            
            # 현재 단계의 예상 시간 조회
            expected_minutes = task.expected_time  # 기본값
            
            if STAGE_CONFIG_AVAILABLE:
                try:
                    stage_config = db.query(StageConfig).filter(
                        StageConfig.task_id == task.id,
                        StageConfig.stage == task.stage
                    ).first()
                    
                    if stage_config:
                        expected_minutes = stage_config.expected_time
                except Exception as e:
                    print(f"⚠️ StageConfig 조회 실패: {e}")
            
            # 예상 시간 대비 경과 시간 비율 계산
            if expected_minutes > 0:
                delay_percentage = float((elapsed_minutes / expected_minutes) * 100)
                
                # 지연 여부 결정
                is_delayed = delay_percentage >= threshold_percentage
                
                # 태스크 지연 상태 업데이트
                if hasattr(task, 'is_delayed') and task.is_delayed != is_delayed:
                    task.is_delayed = is_delayed
                    db.commit()
                    
                    # ✅ WebSocket 알림은 별도의 서비스 레이어에서 처리하도록 변경
                    if is_delayed:
                        print(f"⚠️ 태스크 지연 감지: task_id={task.id}, {delay_percentage:.1f}% 지연")
                        
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
                        "elapsed_time": float(elapsed_minutes),
                        "delay_percentage": float(delay_percentage),
                        "started_at": task.current_stage_started_at,
                        "is_delayed": is_delayed
                    })
    
    return delayed_tasks

def get_delayed_tasks(db: Session, user_id: Optional[int] = None):
    """
    지연된 태스크 목록을 조회합니다.
    """
    query = db.query(Task)
    
    # is_delayed 필드가 있는지 확인
    if hasattr(Task, 'is_delayed'):
        query = query.filter(Task.is_delayed == True)
    else:
        # is_delayed 필드가 없으면 수동으로 계산
        query = query.filter(
            Task.completed_at.is_(None),
            Task.current_stage_started_at.isnot(None)
        )
    
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
        expected_minutes = task.expected_time
        
        if STAGE_CONFIG_AVAILABLE:
            try:
                stage_config = db.query(StageConfig).filter(
                    StageConfig.task_id == task.id,
                    StageConfig.stage == task.stage
                ).first()
                
                if stage_config:
                    expected_minutes = stage_config.expected_time
            except Exception as e:
                print(f"⚠️ StageConfig 조회 실패: {e}")
        
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
            "is_delayed": getattr(task, 'is_delayed', delay_percentage >= 100)
        })
    
    return result
# app/crud/time_tracking.py 파일에 추가할 함수

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
    
    if not completed_tasks:
        return {
            "user_id": user_id,
            "username": user.username,
            "completed_tasks": 0,
            "total_expected_time": 0,
            "total_actual_time": 0,
            "average_efficiency": 1.0,
            "stage_statistics": {}
        }
    
    # 통계 초기화
    total_expected_time = 0
    total_actual_time = 0
    stage_statistics = {}
    
    for task in completed_tasks:
        # 기본 통계 계산
        expected_time = task.expected_time or 0
        total_expected_time += expected_time
        
        # 실제 소요 시간 계산 (완료 시간 - 생성 시간)
        if task.completed_at and task.created_at:
            actual_seconds = (task.completed_at - task.created_at).total_seconds()
            actual_minutes = actual_seconds / 60
            total_actual_time += actual_minutes
        
        # 단계별 통계는 간단하게 처리 (TaskHistory가 없는 경우)
        stage = task.stage
        if stage not in stage_statistics:
            stage_statistics[stage] = {
                "expected_time": 0,
                "actual_time": 0,
                "task_count": 0
            }
        
        stage_statistics[stage]["expected_time"] += expected_time
        stage_statistics[stage]["task_count"] += 1
        
        if task.completed_at and task.created_at:
            actual_seconds = (task.completed_at - task.created_at).total_seconds()
            actual_minutes = actual_seconds / 60
            stage_statistics[stage]["actual_time"] += actual_minutes
    
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
            "efficiency": efficiency,
            "task_count": stats["task_count"]
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

def get_task_time_statistics(db: Session, task_id: int):
    """
    특정 태스크의 단계별 소요 시간 통계를 조회합니다.
    TaskHistory 모델이 없으면 기본 통계만 반환합니다.
    """
    # 태스크 조회
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    
    if not TASK_HISTORY_AVAILABLE:
        # TaskHistory가 없으면 현재 태스크 정보만 반환
        return [{
            "task_id": task_id,
            "title": task.title,
            "stage": task.stage,
            "expected_time": task.expected_time,
            "actual_time": 0,  # 계산할 수 없음
            "efficiency": 1.0
        }]
    
    # TaskHistory가 있는 경우의 복잡한 통계 로직
    try:
        # 단계 이동 이력 조회
        histories = db.query(TaskHistory).filter(
            TaskHistory.task_id == task_id
        ).order_by(TaskHistory.changed_at).all()
        
        # 단계별 설정 조회
        expected_times = {}
        if STAGE_CONFIG_AVAILABLE:
            stage_configs = db.query(StageConfig).filter(
                StageConfig.task_id == task_id
            ).all()
            
            for config in stage_configs:
                expected_times[config.stage] = config.expected_time
        
        # 단계별 실제 소요 시간 계산
        stage_statistics = {}
        
        for history in histories:
            stage = history.previous_stage
            if not stage or not hasattr(history, 'time_spent') or history.time_spent is None:
                continue
            
            # 해당 단계 통계 초기화
            if stage not in stage_statistics:
                stage_statistics[stage] = {
                    "expected_time": expected_times.get(stage, task.expected_time),
                    "actual_time": 0
                }
            
            # 소요 시간 추가 (초 -> 분 변환)
            stage_statistics[stage]["actual_time"] += history.time_spent / 60
        
        # 효율성 계산 및 결과 반환
        result = []
        for stage, stats in stage_statistics.items():
            expected_time = stats["expected_time"]
            actual_time = stats["actual_time"]
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
        
    except Exception as e:
        print(f"❌ 태스크 통계 계산 실패: {e}")
        return [{
            "task_id": task_id,
            "title": task.title,
            "stage": task.stage,
            "expected_time": task.expected_time,
            "actual_time": 0,
            "efficiency": 1.0
        }]
