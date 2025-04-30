from sqlalchemy.orm import Session
from app import models
from app.schemas import task as task_schema  # 스키마 분리된 task 임포트

# 태스크 생성 함수
def create_task(db: Session, task: task_schema.TaskCreate):
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

# 전체 태스크 조회
def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Task).offset(skip).limit(limit).all()

# 단일 태스크 조회
def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).first()

# 태스크 수정
def update_task(db: Session, task_id: int, task: task_schema.TaskUpdate):
    db_task = get_task(db, task_id)
    if db_task:
        for key, value in task.dict(exclude_unset=True).items():
            setattr(db_task, key, value)
        db.commit()
        db.refresh(db_task)
    return db_task

# 태스크 삭제
def delete_task(db: Session, task_id: int):
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
    return db_task

# 모든 태스크 조회
def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Task).offset(skip).limit(limit).all()

# 특정 태스크 조회
def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).first()