# app/routers/help_request.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.utils.security import get_current_user
from app.models.user import User

from app.crud.help_request import (
    get_help_requests,
    get_help_request,
    create_help_request,
    resolve_help_request,
    delete_help_request,
    format_help_request_response,
)
from app.crud.user import get_user
from app.crud.task import get_task
from app.schemas.help_request import (
    HelpRequestSchema,
    HelpRequestCreate,
    HelpRequestUpdate,
)
from app.models.help_request import HelpRequest as HelpRequestModel

router = APIRouter(
    prefix="/help-requests",
    tags=["help-requests"],
)

@router.get("/", response_model=List[HelpRequestSchema])
def read_help_requests(
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청 목록을 조회합니다."""
    # 학생은 자신의 요청만 조회 가능
    if not current_user.is_teacher and user_id != current_user.id:
        user_id = current_user.id
    
    # CRUD 호출
    help_reqs: List[HelpRequestModel] = get_help_requests(
        db, resolved=resolved, user_id=user_id, task_id=None, skip=skip, limit=limit
    )
    
    # 응답 형식으로 변환
    return [HelpRequestSchema(**format_help_request_response(db, hr)) for hr in help_reqs]

@router.get("/{help_request_id}", response_model=HelpRequestSchema)
def read_help_request(
    help_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 도움 요청을 조회합니다."""
    hr = get_help_request(db, help_request_id)
    if not hr:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    # 권한 체크: 학생은 자신의 요청만, 교사는 모든 요청 조회 가능
    if not current_user.is_teacher and hr.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return HelpRequestSchema(**format_help_request_response(db, hr))

@router.post("/", response_model=HelpRequestSchema, status_code=status.HTTP_201_CREATED)
def create_help_request_endpoint(
    help_request: HelpRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """새로운 도움 요청을 생성합니다."""
    # 태스크 존재 확인
    task = get_task(db, help_request.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 체크: 학생은 자신의 태스크에만 도움 요청 가능
    if not current_user.is_teacher and task.user_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="You can only request help for your own tasks"
        )
    
    # 학생의 경우 user_id를 현재 사용자로 설정
    if not current_user.is_teacher:
        help_request.user_id = current_user.id
    
    new_hr = create_help_request(db, current_user.id, help_request)
    if not new_hr:
        raise HTTPException(status_code=400, detail="Failed to create help request")
    
    return HelpRequestSchema(**format_help_request_response(db, new_hr))

@router.put("/{help_request_id}", response_model=HelpRequestSchema)
def update_help_request_endpoint(
    help_request_id: int,
    help_request_update: HelpRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청을 업데이트합니다 (주로 해결용)."""
    # 교사만 도움 요청을 해결할 수 있음
    if not current_user.is_teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can resolve help requests"
        )
    
    existing = get_help_request(db, help_request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    updated = resolve_help_request(db, help_request_id, current_user.id, help_request_update)
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update help request")
    
    return HelpRequestSchema(**format_help_request_response(db, updated))

@router.post("/{help_request_id}/resolve", response_model=HelpRequestSchema)
def resolve_help_request_endpoint(
    help_request_id: int,
    resolution_message: str = Query(..., description="Resolution message"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청을 해결합니다."""
    # 교사만 도움 요청을 해결할 수 있음
    if not current_user.is_teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can resolve help requests"
        )
    
    existing = get_help_request(db, help_request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    if existing.resolved:
        raise HTTPException(status_code=400, detail="Help request already resolved")
    
    resolved = resolve_help_request(
        db, help_request_id, current_user.id,
        HelpRequestUpdate(resolved=True, resolution_message=resolution_message)
    )
    
    if not resolved:
        raise HTTPException(status_code=400, detail="Failed to resolve help request")
    
    return HelpRequestSchema(**format_help_request_response(db, resolved))

@router.delete("/{help_request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_help_request_endpoint(
    help_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청을 삭제합니다."""
    existing = get_help_request(db, help_request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    # 권한 체크: 교사 또는 본인만 삭제 가능
    if not current_user.is_teacher and existing.user_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="You can only delete your own help requests"
        )
    
    deleted = delete_help_request(db, help_request_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Failed to delete help request")

# 태스크별 도움 요청 조회 (추가 기능)
@router.get("/task/{task_id}", response_model=List[HelpRequestSchema])
def read_help_requests_by_task(
    task_id: int,
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 태스크의 도움 요청 목록을 조회합니다."""
    # 태스크 존재 확인
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 체크: 학생은 자신의 태스크만, 교사는 모든 태스크 조회 가능
    if not current_user.is_teacher and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    help_reqs: List[HelpRequestModel] = get_help_requests(
        db, resolved=resolved, user_id=None, task_id=task_id, skip=0, limit=100
    )
    
    return [HelpRequestSchema(**format_help_request_response(db, hr)) for hr in help_reqs]