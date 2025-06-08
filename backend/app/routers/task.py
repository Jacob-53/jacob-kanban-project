# app/routers/task.py - 권한 체크 강화 및 반별 기능 추가
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.task import TaskSchema, TaskCreate, TaskUpdate, ClassTaskCreate
from app.models.user import User
from app.models.task import Task
from app.crud.task import (
    create_task as create_task_crud,
    get_task,
    get_tasks,
    update_task as update_task_crud,
    delete_task as delete_task_crud,
)
from app.dependencies import get_current_user, get_current_teacher

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)

# ✅ 개별 태스크 생성 (권한 체크 강화)
@router.post("/", response_model=TaskSchema)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """개별 학생에게 Task를 배정합니다."""
    
    if current_user.is_teacher:
        # 교사인 경우: 배정하려는 학생이 같은 반인지 확인
        target_user = db.query(User).filter(User.id == task.user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        # 같은 반 학생인지 확인
        if target_user.class_id != current_user.class_id:
            raise HTTPException(
                status_code=403, 
                detail="Can only assign tasks to students in your class"
            )
        
        # Task의 class_id를 자동으로 설정
        task.class_id = current_user.class_id
        
    else:
        # 학생인 경우: 자신에게만 Task 생성 가능
        if task.user_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Students can only create tasks for themselves"
            )
        
        # 학생이 만드는 Task는 자신의 반으로 설정
        task.class_id = current_user.class_id
    
    return create_task_crud(db=db, task=task)

# ✅ 새로 추가: 반 전체에 Task 배정 (교사만 가능)
@router.post("/class-task", response_model=List[TaskSchema])
def create_class_task(
    class_task: ClassTaskCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_teacher),  # 교사만 가능
):
    """반 전체 학생들에게 동일한 Task를 배정합니다."""
    
    # 교사가 해당 반의 담당인지 확인
    if current_user.class_id != class_task.class_id:
        raise HTTPException(
            status_code=403, 
            detail="Can only assign tasks to your own class"
        )
    
    # 해당 반의 모든 학생 조회
    students = db.query(User).filter(
        User.class_id == class_task.class_id,
        User.is_teacher == False
    ).all()
    
    if not students:
        raise HTTPException(
            status_code=404, 
            detail="No students found in this class"
        )
    
    # 각 학생에게 Task 생성
    created_tasks = []
    for student in students:
        task_data = TaskCreate(
            title=class_task.title,
            description=class_task.description,
            stage=class_task.stage,
            expected_time=class_task.expected_time,
            user_id=student.id,
            class_id=class_task.class_id,
            is_class_task=True  # 반 과제임을 표시
        )
        created_task = create_task_crud(db=db, task=task_data)
        created_tasks.append(created_task)
    
    return created_tasks

# ✅ 태스크 목록 조회 (권한 체크 강화)
@router.get("/", response_model=List[TaskSchema])
def read_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """사용자별로 볼 수 있는 Task 목록을 조회합니다."""
    
    if current_user.is_teacher:
        # 교사: 자신이 담당하는 반의 Task만 조회
        if current_user.class_id:
            tasks = db.query(Task).filter(
                Task.class_id == current_user.class_id
            ).offset(skip).limit(limit).all()
        else:
            # 반이 배정되지 않은 교사는 빈 목록
            tasks = []
    else:
        # 학생: 자신의 Task만 조회
        tasks = db.query(Task).filter(
            Task.user_id == current_user.id
        ).offset(skip).limit(limit).all()
    
    return tasks

# ✅ 새로 추가: 특정 반의 Task 목록 조회
@router.get("/class/{class_id}", response_model=List[TaskSchema])
def read_class_tasks(
    class_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """특정 반의 모든 Task를 조회합니다."""
    
    # 권한 체크: 교사는 자신의 반만, 학생은 자신의 반만
    if current_user.class_id != class_id:
        raise HTTPException(
            status_code=403, 
            detail="Can only view tasks from your own class"
        )
    
    tasks = db.query(Task).filter(Task.class_id == class_id).all()
    
    # 학생인 경우 자신의 Task만 필터링
    if not current_user.is_teacher:
        tasks = [t for t in tasks if t.user_id == current_user.id]
    
    return tasks

# ✅ 특정 태스크 조회 (기존 권한 체크 유지)
@router.get("/{task_id}", response_model=TaskSchema)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 체크: 교사는 자신의 반 Task, 학생은 자신의 Task만
    if current_user.is_teacher:
        if task.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Not allowed")
    else:
        if task.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed")
    
    return task

# ✅ 태스크 업데이트 (기존 로직 유지)
@router.put("/{task_id}", response_model=TaskSchema)
def update_task(
    task_id: int,
    task: TaskUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    existing = get_task(db, task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 체크: 교사는 자신의 반 Task, 학생은 자신의 Task만
    if current_user.is_teacher:
        if existing.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Not allowed")
    else:
        if existing.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed")
    
    return update_task_crud(db, task_id, task)

# ✅ 태스크 삭제 (교사만 가능, 자신의 반만)
@router.delete("/{task_id}", response_model=TaskSchema)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_teacher),  # 교사만 가능
):
    existing = get_task(db, task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 자신의 반 Task만 삭제 가능
    if existing.class_id != current_user.class_id:
        raise HTTPException(
            status_code=403, 
            detail="Can only delete tasks from your own class"
        )
    
    return delete_task_crud(db, task_id)