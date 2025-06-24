# app/routers/time_tracking.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.time_tracking import DelayStatus, TimeStatistics, UserTimeStatistics
from app.crud.time_tracking import (
    check_delayed_tasks,
    get_delayed_tasks,
    get_task_time_statistics,
    get_user_time_statistics
)

router = APIRouter(
    prefix="/time-tracking",
    tags=["time-tracking"],
)

# 지연 상태 체크 (백그라운드 태스크)
def background_check_delayed_tasks(db: Session):
    check_delayed_tasks(db)

# 지연 체크 API
@router.post("/check-delays", response_model=List[DelayStatus])
def check_delays(
    background_tasks: BackgroundTasks,
    threshold_percentage: float = 100.0,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 교사 권한 확인
    if not current_user.is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can trigger delay checks")
    
    # 백그라운드에서 체크 수행
    background_tasks.add_task(background_check_delayed_tasks, db)
    
    # 지연된 태스크 목록 반환
    delayed_tasks = get_delayed_tasks(db)
    return delayed_tasks

# 지연된 태스크 조회 API
@router.get("/delayed-tasks", response_model=List[DelayStatus])
def read_delayed_tasks(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 교사이거나 자신의 태스크만 조회 가능
    if not current_user.is_teacher and (user_id is None or user_id != current_user.id):
        user_id = current_user.id
    
    return get_delayed_tasks(db, user_id)

# 태스크 시간 통계 조회 API
@router.get("/tasks/{task_id}/statistics", response_model=List[TimeStatistics])
def read_task_statistics(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 태스크 존재 확인 및 권한 체크는 구현 필요
    
    stats = get_task_time_statistics(db, task_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return stats

# 사용자 시간 통계 조회 API
@router.get("/users/{user_id}/statistics", response_model=UserTimeStatistics)
def read_user_statistics(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 교사이거나 자신의 통계만 조회 가능
    if not current_user.is_teacher and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this user's statistics")
    
    stats = get_user_time_statistics(db, user_id)
    if not stats:
        raise HTTPException(status_code=404, detail="User not found")
    
    return stats