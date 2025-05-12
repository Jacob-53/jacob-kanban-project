from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.task import TaskSchema, TaskCreate, TaskUpdate  # 수정된 부분
from app.crud.task import (
    create_task as create_task_crud,
    get_task,
    get_tasks,
    update_task as update_task_crud,
    delete_task as delete_task_crud,
)
from app.utils.security import get_current_user

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)

# 👉 태스크 생성
@router.post("/", response_model=TaskSchema)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # ← 인증 강제
):
    # (선택) 학생은 자기 자신(user_id)만 생성 가능하도록 추가 검사
    if not current_user.is_teacher and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to assign tasks to others")
    return create_task_crud(db=db, task=task)

# 👉 태스크 목록 조회
@router.get("/", response_model=list[TaskSchema])
def read_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # ← 인증 강제
):
    tasks = get_tasks(db, skip=skip, limit=limit)
    # (선택) 학생은 자기 태스크만 필터링
    if not current_user.is_teacher:
        tasks = [t for t in tasks if t.user_id == current_user.id]
    return tasks

# 👉 특정 태스크 조회
@router.get("/{task_id}", response_model=TaskSchema)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # ← 인증 강제
):
    t = get_task(db, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    if not current_user.is_teacher and t.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return t

# 👉 태스크 업데이트
@router.put("/{task_id}", response_model=TaskSchema)
def update_task(
    task_id: int,
    task: TaskUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # ← 인증 강제
):
    existing = get_task(db, task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    if not current_user.is_teacher and existing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return update_task_crud(db, task_id, task)

# 👉 태스크 삭제
@router.delete("/{task_id}", response_model=TaskSchema)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # ← 인증 강제
):
    existing = get_task(db, task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    if not current_user.is_teacher:
        raise HTTPException(status_code=403, detail="Only teacher can delete tasks")
    return delete_task_crud(db, task_id)