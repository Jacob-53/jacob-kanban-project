from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import task as task_schema
from app.crud import task as task_crud

router = APIRouter()

# ✅ 태스크 생성 API
@router.post("/tasks/", response_model=task_schema.Task)
def create_task(task: task_schema.TaskCreate, db: Session = Depends(get_db)):
    return task_crud.create_task(db=db, task=task)


# ✅ 모든 태스크 조회 API
@router.get("/tasks/", response_model=List[task_schema.Task])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return task_crud.get_tasks(db, skip=skip, limit=limit)

# ✅ 단일 태스크 조회 API
@router.get("/tasks/{task_id}", response_model=task_schema.Task)
def read_task(task_id: int, db: Session = Depends(get_db)):
    db_task = task_crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

# ✅ 태스크 수정 API
@router.put("/tasks/{task_id}", response_model=task_schema.Task)
def update_task(task_id: int, task: task_schema.TaskUpdate, db: Session = Depends(get_db)):
    db_task = task_crud.update_task(db, task_id=task_id, task=task)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

# ✅ 태스크 삭제 API
@router.delete("/tasks/{task_id}", response_model=task_schema.Task)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = task_crud.delete_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

