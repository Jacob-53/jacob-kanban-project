# src/routers/help_request.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.dependencies import get_current_user, get_current_teacher_or_admin
from app.models.user import User

from app.crud.help_request import (
    get_help_requests,
    get_help_request,
    create_help_request,
    update_help_request,
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
    """
    도움 요청 목록 조회
    - 학생: 자신의 요청만 조회
    - 교사: 자신의 반 학생들의 요청만 조회
    - 관리자: 전체 조회
    """
    # 학생은 자신의 요청만
    if current_user.role == "student":
        user_id = current_user.id

    # 교사는 자신의 반 학생들만
    elif current_user.role == "teacher" and user_id is not None:
        target_user = get_user(db, user_id)
        if not target_user or target_user.class_id != current_user.class_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only access help requests from your class students"
            )

    help_requests: List[HelpRequestModel] = get_help_requests(
        db,
        resolved=resolved,
        user_id=user_id,
        task_id=None,
        skip=skip,
        limit=limit
    )
    # dict → Pydantic 모델로 명시적 변환
    return [HelpRequestSchema(**format_help_request_response(db, hr)) for hr in help_requests]

@router.get("/{help_request_id}", response_model=HelpRequestSchema)
def read_help_request(
    help_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 도움 요청 조회"""
    hr = get_help_request(db, help_request_id)
    if not hr:
        raise HTTPException(status_code=404, detail="Help request not found")
    # 권한 체크
    if current_user.role == "student" and hr.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "teacher":
        student = get_user(db, hr.user_id)
        if not student or student.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Access denied")
    # 변환
    return HelpRequestSchema(**format_help_request_response(db, hr))

@router.post("/", response_model=HelpRequestSchema, status_code=status.HTTP_201_CREATED)
def create_help_request_endpoint(
    help_request: HelpRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청 생성"""
    # 학생만 자신의 요청 생성 가능
    if current_user.role == "student":
        help_request.user_id = current_user.id
    new_hr = create_help_request(db, current_user.id, help_request)
    if not new_hr:
        raise HTTPException(status_code=404, detail="Task not found")
    return HelpRequestSchema(**format_help_request_response(db, new_hr))

@router.put("/{help_request_id}", response_model=HelpRequestSchema)
def update_help_request_endpoint(
    help_request_id: int,
    help_request_update: HelpRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher_or_admin)
):
    """도움 요청 업데이트 (교사/관리자)"""
    existing = get_help_request(db, help_request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Help request not found")
    updated = update_help_request(db, help_request_id, help_request_update)
    return HelpRequestSchema(**format_help_request_response(db, updated))

@router.post("/{help_request_id}/resolve", response_model=HelpRequestSchema)
def resolve_help_request_endpoint(
    help_request_id: int,
    resolution_message: str = Query(..., description="Resolution message"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher_or_admin)
):
    """도움 요청 해결 (교사/관리자)"""
    existing = get_help_request(db, help_request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Help request not found")
    resolved = resolve_help_request(
        db, help_request_id, current_user.id,
        HelpRequestUpdate(resolved=True, resolution_message=resolution_message)
    )
    return HelpRequestSchema(**format_help_request_response(db, resolved))

@router.delete("/{help_request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_help_request_endpoint(
    help_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청 삭제"""
    existing = get_help_request(db, help_request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Help request not found")
    if current_user.role != "admin" and existing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own help requests")
    delete_help_request(db, help_request_id)
