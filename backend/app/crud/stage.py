# app/crud/stage.py
from sqlalchemy.orm import Session
from datetime import datetime
import threading
import asyncio
from app.models.task import Task, TaskStage
from app.models.task_history import TaskHistory
from app.models.stage_config import StageConfig
from app.schemas.stage import StageConfigCreate, StageConfigUpdate
from app.utils.websocket_manager import manager

# 단계 이동 함수
def move_task_stage(db: Session, task_id: int, user_id: int, new_stage: str, comment: str = None):
    """
    태스크의 단계를 이동하고 이력을 저장합니다.
    """
    # 태스크 조회
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    
    # 이전 단계 저장
    previous_stage = task.stage
    
    # 시간 계산
    now = datetime.utcnow()
    time_spent = None
    if task.current_stage_started_at:
        time_spent = int((now - task.current_stage_started_at).total_seconds())
    
    # 단계 이동
    task.stage = new_stage
    task.current_stage_started_at = now
    
    # 완료 단계인 경우
    if new_stage == TaskStage.DONE:
        task.completed_at = now
    
    # 이력 저장
    history = TaskHistory(
        task_id=task_id,
        user_id=user_id,
        previous_stage=previous_stage,
        new_stage=new_stage,
        changed_at=now,
        time_spent=time_spent,
        comment=comment
    )
    db.add(history)
    
    # 변경사항 저장
    db.commit()
    db.refresh(task)
    db.refresh(history)

    # WebSocket 알림 전송 - 별도 스레드에서 비동기 작업 실행
    def run_async_task():
        try:
            # 새 이벤트 루프 생성
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # 이벤트 루프에서 비동기 함수 실행
            loop.run_until_complete(
                manager.send_task_update(
                    task_id=task_id,
                    user_id=str(task.user_id),
                    update_type="stage_changed",
                    data={
                        "previous_stage": previous_stage,
                        "new_stage": new_stage,
                        "time_spent": time_spent,
                        "comment": comment
                    }
                )
            )
            loop.close()
        except Exception as e:
            print(f"알림 전송 중 오류 발생: {e}")
    
    # 새 스레드에서 비동기 작업 실행
    thread = threading.Thread(target=run_async_task)
    thread.daemon = True
    thread.start()
    
    return {"task": task, "history": history}

# 단계 설정 생성
def create_stage_config(db: Session, config: StageConfigCreate):
    db_config = StageConfig(**config.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

# 단계 설정 조회
def get_stage_configs(db: Session, task_id: int):
    return db.query(StageConfig).filter(StageConfig.task_id == task_id).order_by(StageConfig.order).all()

# 단계 설정 업데이트
def update_stage_config(db: Session, config_id: int, config: StageConfigUpdate):
    db_config = db.query(StageConfig).filter(StageConfig.id == config_id).first()
    if not db_config:
        return None
    
    # 필드 업데이트
    for key, value in config.dict(exclude_unset=True).items():
        setattr(db_config, key, value)
    
    db.commit()
    db.refresh(db_config)
    return db_config

# 단계 설정 삭제
def delete_stage_config(db: Session, config_id: int):
    db_config = db.query(StageConfig).filter(StageConfig.id == config_id).first()
    if not db_config:
        return None
    
    db.delete(db_config)
    db.commit()
    return db_config

# 단계 이력 조회
def get_task_histories(db: Session, task_id: int):
    return db.query(TaskHistory).filter(TaskHistory.task_id == task_id).order_by(TaskHistory.changed_at.desc()).all()

# 단계별 통계 (선택적)
def get_stage_statistics(db: Session, user_id: int = None):
    """
    각 단계별 태스크 수와 평균 소요 시간을 계산합니다.
    """
    # 구현 예정
    pass