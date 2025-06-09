# app/routers/help_request.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.utils.security import get_current_user
from app.schemas.help_request import HelpRequestCreate, HelpRequestUpdate, HelpRequestSchema
from app.crud.help_request import (
    create_help_request,
    get_help_requests,
    get_help_request,
    resolve_help_request,
    format_help_request_response
)

router = APIRouter(
    prefix="/help-requests",
    tags=["help-requests"],
)

# 도움 요청 생성 API
@router.post("/", response_model=HelpRequestSchema)
def create_help_request_endpoint(
    request: HelpRequestCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    학생이 도움을 요청합니다.
    """
    help_request = create_help_request(db, current_user.id, request)
    if not help_request:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return format_help_request_response(db, help_request)

# 도움 요청 목록 조회 API
@router.get("/", response_model=List[HelpRequestSchema])
def read_help_requests(
    resolved: Optional[bool] = None,
    user_id: Optional[int] = None,
    task_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not current_user.is_teacher:
        user_id = current_user.id

    help_requests = get_help_requests(
        db, resolved=resolved, user_id=user_id, task_id=task_id, skip=skip, limit=limit
    )

    # ✨ 디버깅용 로그
    results = [format_help_request_response(db, hr) for hr in help_requests]
    print("📦 반환 데이터 샘플:", results[0] if results else "no data")
    
    return results


# 특정 도움 요청 조회 API
@router.get("/{help_request_id}", response_model=HelpRequestSchema)
def read_help_request(
    help_request_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    특정 ID의 도움 요청을 조회합니다.
    """
    help_request = get_help_request(db, help_request_id)
    if not help_request:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    # 학생이라면 자신의 요청만 볼 수 있도록 제한
    if not current_user.is_teacher and help_request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this help request")
    
    return format_help_request_response(db, help_request)

# 도움 요청 해결 API
@router.put("/{help_request_id}/resolve", response_model=HelpRequestSchema)
def resolve_help_request_endpoint(
    help_request_id: int,
    resolution_data: HelpRequestUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    도움 요청을 해결 상태로 변경합니다.
    교사만 이 작업을 수행할 수 있습니다.
    """
    # 교사 권한 확인
    if not current_user.is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can resolve help requests")
    
    help_request = get_help_request(db, help_request_id)
    if not help_request:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    resolved = resolve_help_request(db, help_request_id, current_user.id, resolution_data)
    
    return format_help_request_response(db, resolved)

# 특정 태스크의 도움 요청 조회 API
@router.get("/tasks/{task_id}", response_model=List[HelpRequestSchema])
def read_task_help_requests(
    task_id: int,
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    특정 태스크에 대한 도움 요청 목록을 조회합니다.
    """
    # 태스크에 대한 접근 권한 확인 로직 (필요하다면 추가)
    
    help_requests = get_help_requests(db, resolved=resolved, task_id=task_id)
    
    return [format_help_request_response(db, hr) for hr in help_requests]