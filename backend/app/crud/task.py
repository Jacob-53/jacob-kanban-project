# app/crud/task.py (완전한 버전)

from sqlalchemy.orm import Session
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskSchema, TaskUpdate
from datetime import datetime

def create_task(db: Session, task: TaskCreate):
    """태스크를 생성합니다."""
    # 스키마 데이터를 딕셔너리로 변환
    task_data = task.dict()
    
    # status 필드가 있으면 제거 (또는 stage로 매핑)
    if "status" in task_data:
        status_value = task_data.pop("status")
        if "stage" not in task_data or not task_data["stage"]:
            task_data["stage"] = status_value
    
    # 현재 시간 설정
    if "created_at" not in task_data:
        task_data["created_at"] = datetime.utcnow()
    
    if "current_stage_started_at" not in task_data:
        task_data["current_stage_started_at"] = datetime.utcnow()
    
    # Task 모델에 있는 필드만 필터링
    valid_fields = Task.__table__.columns.keys()
    filtered_data = {k: v for k, v in task_data.items() if k in valid_fields}
    
    # Task 인스턴스 생성
    db_task = Task(**filtered_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    print(f"✅ 태스크 생성 완료: task_id={db_task.id}")
    return db_task

def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    """전체 태스크 목록을 조회합니다."""
    return db.query(Task).offset(skip).limit(limit).all()

def get_task(db: Session, task_id: int):
    """단일 태스크를 조회합니다."""
    return db.query(Task).filter(Task.id == task_id).first()

def update_task(db: Session, task_id: int, task: TaskUpdate):
    """태스크를 수정합니다."""
    db_task = get_task(db, task_id)
    if db_task:
        update_data = task.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_task, key, value)
        
        # 수정 시간 업데이트
        if hasattr(db_task, 'updated_at'):
            db_task.updated_at = datetime.utcnow()
            
        db.commit()
        db.refresh(db_task)
        print(f"✅ 태스크 수정 완료: task_id={db_task.id}")
    return db_task

def delete_task(db: Session, task_id: int):
    """태스크를 삭제합니다."""
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        print(f"✅ 태스크 삭제 완료: task_id={task_id}")
    return db_task

def get_tasks_by_user_id(db: Session, user_id: int):
    """특정 사용자의 태스크 목록을 조회합니다."""
    return db.query(Task).filter(Task.user_id == user_id).all()

def get_all_tasks(db: Session):
    """전체 태스크 목록을 조회합니다."""
    return db.query(Task).all()

def get_tasks_by_class_id(db: Session, class_id: int):
    """특정 반의 태스크 목록을 조회합니다."""
    return db.query(Task).filter(Task.class_id == class_id).all()