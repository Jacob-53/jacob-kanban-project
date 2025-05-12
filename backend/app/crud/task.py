from sqlalchemy.orm import Session
from app.models.task import Task  # Task 직접 임포트
from app.schemas.task import TaskCreate, TaskSchema, TaskUpdate  # 스키마 임포트


# 태스크 생성 함수
def create_task(db: Session, task: TaskCreate):
    # 스키마 데이터를 딕셔너리로 변환
    task_data = task.dict()
    
    # status 필드가 있으면 제거 (또는 stage로 매핑)
    if "status" in task_data:
        status_value = task_data.pop("status")  # status 제거
        # stage가 없으면 status 값으로 설정 (선택적)
        if "stage" not in task_data or not task_data["stage"]:
            task_data["stage"] = status_value
    
    # Task 모델에 있는 필드만 필터링
    valid_fields = Task.__table__.columns.keys()
    filtered_data = {k: v for k, v in task_data.items() if k in valid_fields}
    
    # 필터링된 데이터로 Task 인스턴스 생성
    db_task = Task(**filtered_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

# 전체 태스크 조회
def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Task).offset(skip).limit(limit).all()  # 직접 임포트한 Task 사용

# 단일 태스크 조회
def get_task(db: Session, task_id: int):
    return db.query(Task).filter(Task.id == task_id).first()  # 직접 임포트한 Task 사용

# 태스크 수정
def update_task(db: Session, task_id: int, task: TaskUpdate):
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

# 특정 유저 태스크 조회
def get_tasks_by_user_id(db: Session, user_id: int):
    return db.query(Task).filter(Task.user_id == user_id).all()  # 직접 임포트한 Task 사용

#전체 task 목록 조회
def get_all_tasks(db: Session):
    return db.query(Task).all()  # 직접 임포트한 Task 사용