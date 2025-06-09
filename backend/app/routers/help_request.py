# app/routers/help_request.py - 응답 모델 명시적 변환
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user, get_current_teacher_or_admin
from app.schemas.help_request import (
    HelpRequestCreate, 
    HelpRequestUpdate, 
    HelpRequestSchema  # ✅ 명시적 import
)
from app.crud.help_request import (
    create_help_request,
    get_help_requests,
    get_help_request,
    update_help_request,
    delete_help_request,
    get_help_requests_by_user,
    resolve_help_request
)
from app.models.user import User

router = APIRouter(
    prefix="/help-requests",
    tags=["help-requests"],
)

@router.get("/", response_model=List[HelpRequestSchema])
def read_help_requests(
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청 목록 조회"""
    
    # 학생은 자신의 요청만 조회 가능
    if current_user.role == "student":
        user_id = current_user.id
    
    # 교사는 자신의 반 학생들의 요청만 조회 가능
    elif current_user.role == "teacher" and user_id:
        # 요청된 user_id가 자신의 반 학생인지 확인
        from app.crud.user import get_user
        target_user = get_user(db, user_id)
        if not target_user or target_user.class_id != current_user.class_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only access help requests from your class students"
            )
    
    # CRUD에서 가져온 데이터를 명시적으로 스키마로 변환
    if user_id:
        help_requests = get_help_requests_by_user(db, user_id, resolved, skip, limit)
    else:
        help_requests = get_help_requests(db, resolved, skip, limit)
    
    # ✅ 명시적으로 HelpRequestSchema 인스턴스로 변환
    result = []
    for req in help_requests:
        # 관련 정보 조회
        from app.crud.user import get_user
        from app.crud.task import get_task
        
        student = get_user(db, req.user_id)
        task = get_task(db, req.task_id) if req.task_id else None
        resolver = get_user(db, req.resolved_by) if req.resolved_by else None
        
        result.append(HelpRequestSchema(
            id=req.id,
            task_id=req.task_id,
            user_id=req.user_id,
            message=req.message,
            requested_at=req.requested_at,
            resolved=req.resolved,
            resolved_at=req.resolved_at,
            resolved_by=req.resolved_by,
            resolution_message=req.resolution_message,
            # 추가 정보
            student_name=student.username if student else None,
            task_title=task.title if task else None,
            resolver_name=resolver.username if resolver else None
        ))
    
    return result

@router.get("/{help_request_id}", response_model=HelpRequestSchema)
def read_help_request(
    help_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 도움 요청 조회"""
    help_request = get_help_request(db, help_request_id)
    if not help_request:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    # 권한 체크: 관리자, 요청자, 해당 반 교사만 조회 가능
    if current_user.role == "admin":
        pass  # 관리자는 모든 요청 조회 가능
    elif help_request.user_id == current_user.id:
        pass  # 요청자 본인
    elif current_user.role == "teacher":
        # 교사는 자신의 반 학생 요청만 조회 가능
        from app.crud.user import get_user
        student = get_user(db, help_request.user_id)
        if not student or student.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # ✅ 명시적으로 HelpRequestSchema 인스턴스로 변환
    from app.crud.user import get_user
    from app.crud.task import get_task
    
    student = get_user(db, help_request.user_id)
    task = get_task(db, help_request.task_id) if help_request.task_id else None
    resolver = get_user(db, help_request.resolved_by) if help_request.resolved_by else None
    
    return HelpRequestSchema(
        id=help_request.id,
        task_id=help_request.task_id,
        user_id=help_request.user_id,
        message=help_request.message,
        requested_at=help_request.requested_at,
        resolved=help_request.resolved,
        resolved_at=help_request.resolved_at,
        resolved_by=help_request.resolved_by,
        resolution_message=help_request.resolution_message,
        # 추가 정보
        student_name=student.username if student else None,
        task_title=task.title if task else None,
        resolver_name=resolver.username if resolver else None
    )

@router.post("/", response_model=HelpRequestSchema, status_code=status.HTTP_201_CREATED)
def create_help_request_endpoint(
    help_request: HelpRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청 생성"""
    
    # 학생만 도움 요청 생성 가능 (자신의 요청만)
    if current_user.role == "student":
        help_request.user_id = current_user.id
    elif current_user.role in ["teacher", "admin"]:
        # 교사나 관리자는 다른 사용자의 요청도 생성 가능
        if not help_request.user_id:
            help_request.user_id = current_user.id
    
    # 태스크 존재 확인 (선택사항)
    if help_request.task_id:
        from app.crud.task import get_task
        task = get_task(db, help_request.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # 태스크 소유자 확인
        if task.user_id != help_request.user_id:
            raise HTTPException(status_code=400, detail="Task does not belong to the user")
    
    new_help_request = create_help_request(db, help_request)
    
    # ✅ 명시적으로 HelpRequestSchema 인스턴스로 변환
    from app.crud.user import get_user
    from app.crud.task import get_task
    
    student = get_user(db, new_help_request.user_id)
    task = get_task(db, new_help_request.task_id) if new_help_request.task_id else None
    
    return HelpRequestSchema(
        id=new_help_request.id,
        task_id=new_help_request.task_id,
        user_id=new_help_request.user_id,
        message=new_help_request.message,
        requested_at=new_help_request.requested_at,
        resolved=new_help_request.resolved,
        resolved_at=new_help_request.resolved_at,
        resolved_by=new_help_request.resolved_by,
        resolution_message=new_help_request.resolution_message,
        # 추가 정보
        student_name=student.username if student else None,
        task_title=task.title if task else None,
        resolver_name=None
    )

@router.put("/{help_request_id}", response_model=HelpRequestSchema)
def update_help_request_endpoint(
    help_request_id: int,
    help_request_update: HelpRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher_or_admin)
):
    """도움 요청 업데이트 (교사/관리자만 가능)"""
    existing_request = get_help_request(db, help_request_id)
    if not existing_request:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    # 교사는 자신의 반 학생 요청만 수정 가능
    if current_user.role == "teacher":
        from app.crud.user import get_user
        student = get_user(db, existing_request.user_id)
        if not student or student.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Can only update requests from your class students")
    
    updated_request = update_help_request(db, help_request_id, help_request_update)
    
    # ✅ 명시적으로 HelpRequestSchema 인스턴스로 변환
    from app.crud.user import get_user
    from app.crud.task import get_task
    
    student = get_user(db, updated_request.user_id)
    task = get_task(db, updated_request.task_id) if updated_request.task_id else None
    resolver = get_user(db, updated_request.resolved_by) if updated_request.resolved_by else None
    
    return HelpRequestSchema(
        id=updated_request.id,
        task_id=updated_request.task_id,
        user_id=updated_request.user_id,
        message=updated_request.message,
        requested_at=updated_request.requested_at,
        resolved=updated_request.resolved,
        resolved_at=updated_request.resolved_at,
        resolved_by=updated_request.resolved_by,
        resolution_message=updated_request.resolution_message,
        # 추가 정보
        student_name=student.username if student else None,
        task_title=task.title if task else None,
        resolver_name=resolver.username if resolver else None
    )

@router.post("/{help_request_id}/resolve", response_model=HelpRequestSchema)
def resolve_help_request_endpoint(
    help_request_id: int,
    resolution_message: str = Query(..., description="Resolution message"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher_or_admin)
):
    """도움 요청 해결 (교사/관리자만 가능)"""
    existing_request = get_help_request(db, help_request_id)
    if not existing_request:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    if existing_request.resolved:
        raise HTTPException(status_code=400, detail="Help request already resolved")
    
    # 교사는 자신의 반 학생 요청만 해결 가능
    if current_user.role == "teacher":
        from app.crud.user import get_user
        student = get_user(db, existing_request.user_id)
        if not student or student.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Can only resolve requests from your class students")
    
    resolved_request = resolve_help_request(db, help_request_id, current_user.id, resolution_message)
    
    # ✅ 명시적으로 HelpRequestSchema 인스턴스로 변환
    from app.crud.user import get_user
    from app.crud.task import get_task
    
    student = get_user(db, resolved_request.user_id)
    task = get_task(db, resolved_request.task_id) if resolved_request.task_id else None
    resolver = get_user(db, resolved_request.resolved_by) if resolved_request.resolved_by else None
    
    return HelpRequestSchema(
        id=resolved_request.id,
        task_id=resolved_request.task_id,
        user_id=resolved_request.user_id,
        message=resolved_request.message,
        requested_at=resolved_request.requested_at,
        resolved=resolved_request.resolved,
        resolved_at=resolved_request.resolved_at,
        resolved_by=resolved_request.resolved_by,
        resolution_message=resolved_request.resolution_message,
        # 추가 정보
        student_name=student.username if student else None,
        task_title=task.title if task else None,
        resolver_name=resolver.username if resolver else None
    )

@router.delete("/{help_request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_help_request_endpoint(
    help_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """도움 요청 삭제"""
    existing_request = get_help_request(db, help_request_id)
    if not existing_request:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    # 요청자 본인이거나 관리자만 삭제 가능
    if current_user.role != "admin" and existing_request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own help requests")
    
    delete_help_request(db, help_request_id)