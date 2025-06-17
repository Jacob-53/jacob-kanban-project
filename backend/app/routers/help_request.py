# app/routers/help_request.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.task import Task  # ✅ 새로 추가: WebSocket에서 사용
from app.models.help_request import HelpRequest as HelpRequestModel

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
    HelpRequestResolve,  # ✅ 새로 추가: WebSocket 해결용 스키마
)

# ✅ WebSocket 매니저 추가 (선택적 - WebSocket 사용 시에만)
try:
    from app.utils.websocket_manager import manager
    WEBSOCKET_ENABLED = True
except ImportError:
    WEBSOCKET_ENABLED = False
    print("⚠️ WebSocket manager not found. WebSocket features disabled.")

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

# ✅ 수정: WebSocket 브로드캐스트 기능 추가
@router.post("/", response_model=HelpRequestSchema, status_code=status.HTTP_201_CREATED)
async def create_help_request_endpoint(  # async 추가
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
    
    new_hr = create_help_request(db, current_user.id, help_request)
    if not new_hr:
        raise HTTPException(status_code=400, detail="Failed to create help request")
    
    # ✅ 태스크의 help_needed 플래그 업데이트
    task.help_needed = True
    task.help_requested_at = datetime.utcnow()
    task.help_message = help_request.message
    db.commit()
    
    # ✅ WebSocket 브로드캐스트 (선택적)
    if WEBSOCKET_ENABLED:
        try:
            # 교사들에게 즉시 알림
            await manager.send_help_request_notification(
                help_request_id=new_hr.id,
                task_id=task.id,
                user_id=str(current_user.id),
                message=help_request.message or "도움이 필요합니다"
            )
            
            # 상세한 브로드캐스트 메시지
            broadcast_data = {
                "type": "help_request_created",
                "help_request_id": new_hr.id,
                "task_id": task.id,
                "task_title": task.title,
                "user_id": current_user.id,
                "username": current_user.username,
                "class_id": getattr(task, 'class_id', None),
                "message": help_request.message,
                "requested_at": new_hr.requested_at.isoformat(),
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "stage": getattr(task, 'stage', 'unknown'),
                    "help_needed": True,
                    "help_message": help_request.message
                }
            }
            
            # 교사들에게 상세 알림
            await manager.broadcast_to_teachers(broadcast_data)
            
            print(f"✅ 도움 요청 WebSocket 브로드캐스트 완료: {new_hr.id}")
            
        except Exception as e:
            print(f"❌ 도움 요청 WebSocket 브로드캐스트 실패: {e}")
            # WebSocket 실패해도 도움 요청 생성은 성공으로 처리
    
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

# ✅ 새로 추가: WebSocket 브로드캐스트가 포함된 해결 엔드포인트
@router.put("/{help_request_id}/resolve", response_model=HelpRequestSchema)
async def resolve_help_request_with_websocket(  # async 추가
    help_request_id: int,
    resolve_data: HelpRequestResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """도움 요청을 해결합니다. (WebSocket 브로드캐스트 포함)"""
    
    if not current_user.is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can resolve help requests")
    
    help_request_obj = get_help_request(db, help_request_id)
    if not help_request_obj:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    # 태스크 조회
    task = get_task(db, help_request_obj.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Related task not found")
    
    # 도움 요청 해결
    resolved_request = resolve_help_request(
        db, help_request_id, current_user.id,
        HelpRequestUpdate(resolved=True, resolution_message=resolve_data.resolution_message)
    )
    
    if not resolved_request:
        raise HTTPException(status_code=400, detail="Failed to resolve help request")
    
    # ✅ 태스크의 help_needed 플래그 업데이트
    task.help_needed = False
    task.help_message = None
    db.commit()
    
    # ✅ WebSocket 브로드캐스트 (선택적)
    if WEBSOCKET_ENABLED:
        try:
            # 요청한 학생에게 해결 알림
            await manager.send_help_resolved_notification(
                help_request_id=resolved_request.id,
                task_id=task.id,
                user_id=str(help_request_obj.user_id),
                resolver_id=str(current_user.id),
                resolution_message=resolve_data.resolution_message or "도움 요청이 해결되었습니다"
            )
            
            # 상세한 브로드캐스트 메시지
            broadcast_data = {
                "type": "help_request_resolved",
                "help_request_id": resolved_request.id,
                "task_id": task.id,
                "task_title": task.title,
                "user_id": help_request_obj.user_id,
                "resolver_id": current_user.id,
                "resolver_name": current_user.username,
                "resolution_message": resolve_data.resolution_message,
                "resolved_at": resolved_request.resolved_at.isoformat() if resolved_request.resolved_at else None,
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "stage": getattr(task, 'stage', 'unknown'),
                    "help_needed": False,
                    "help_message": None
                }
            }
            
            # 교사들에게 해결 완료 알림
            await manager.broadcast_to_teachers(broadcast_data)
            
            print(f"✅ 도움 요청 해결 WebSocket 브로드캐스트 완료: {resolved_request.id}")
            
        except Exception as e:
            print(f"❌ 도움 요청 해결 WebSocket 브로드캐스트 실패: {e}")
    
    return HelpRequestSchema(**format_help_request_response(db, resolved_request))

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