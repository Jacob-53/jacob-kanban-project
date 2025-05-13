# app/crud/help_request.py
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.help_request import HelpRequest
from app.models.user import User
from app.models.task import Task
from app.schemas.help_request import HelpRequestCreate, HelpRequestUpdate
from typing import List, Optional
from app.utils.websocket_manager import manager

def create_help_request(db: Session, user_id: int, help_request: HelpRequestCreate):
    """
    학생의 도움 요청을 생성합니다.
    """
    # 태스크 존재 확인
    task = db.query(Task).filter(Task.id == help_request.task_id).first()
    if not task:
        return None
    
    # 이미 해결되지 않은 도움 요청이 있는지 확인
    existing_request = db.query(HelpRequest).filter(
        HelpRequest.task_id == help_request.task_id,
        HelpRequest.user_id == user_id,
        HelpRequest.resolved == False
    ).first()
    
    if existing_request:
        # 이미 요청이、 있으면 메시지만 업데이트
        if help_request.message:
            existing_request.message = help_request.message
            db.commit()
            db.refresh(existing_request)
        return existing_request
    
    # 새 도움 요청 생성
    db_help_request = HelpRequest(
        task_id=help_request.task_id,
        user_id=user_id,
        message=help_request.message,
        requested_at=datetime.utcnow(),
        resolved=False
    )
    
    # 태스크 모델에도 도움 요청 상태 업데이트
    task.help_needed = True
    task.help_requested_at = db_help_request.requested_at
    task.help_message = help_request.message
    
    db.add(db_help_request)
    db.commit()
    db.refresh(db_help_request)
    # WebSocket 알림 전송 (비동기 함수를 동기 환경에서 실행)
    import asyncio
    asyncio.create_task(
        manager.send_help_request_notification(
            help_request_id=db_help_request.id,
            task_id=db_help_request.task_id,
            user_id=str(user_id),
            message=db_help_request.message or "도움이 필요합니다."
        )
    )
    return db_help_request

def get_help_requests(db: Session, 
                     resolved: Optional[bool] = None, 
                     user_id: Optional[int] = None,
                     task_id: Optional[int] = None,
                     skip: int = 0, 
                     limit: int = 100):
    """
    도움 요청 목록을 조회합니다.
    필터링 옵션:
    - resolved: 해결 여부
    - user_id: 특정 학생의 요청만 조회
    - task_id: 특정 태스크에 대한 요청만 조회
    """
    query = db.query(HelpRequest)
    
    # 필터 적용
    if resolved is not None:
        query = query.filter(HelpRequest.resolved == resolved)
    if user_id is not None:
        query = query.filter(HelpRequest.user_id == user_id)
    if task_id is not None:
        query = query.filter(HelpRequest.task_id == task_id)
    
    # 최신순 정렬
    query = query.order_by(HelpRequest.requested_at.desc())
    
    # 페이지네이션
    return query.offset(skip).limit(limit).all()

def get_help_request(db: Session, help_request_id: int):
    """
    특정 ID의 도움 요청을 조회합니다.
    """
    return db.query(HelpRequest).filter(HelpRequest.id == help_request_id).first()

def resolve_help_request(db: Session, help_request_id: int, resolver_id: int, 
                        update_data: HelpRequestUpdate):
    """
    도움 요청을 해결 상태로 변경합니다.
    """
    help_request = get_help_request(db, help_request_id)
    if not help_request:
        return None
    
    # 이미 해결된 요청인지 확인
    if help_request.resolved:
        return help_request
    
    # 도움 요청 상태 업데이트
    help_request.resolved = update_data.resolved
    help_request.resolved_at = datetime.utcnow()
    help_request.resolved_by = resolver_id
    help_request.resolution_message = update_data.resolution_message
    
    # 관련 태스크의 도움 요청 상태도 업데이트
    task = db.query(Task).filter(Task.id == help_request.task_id).first()
    if task:
        task.help_needed = False
    
    db.commit()
    db.refresh(help_request)
    # WebSocket 알림 전송 (비동기 함수를 동기 환경에서 실행)
    import asyncio
    asyncio.create_task(
        manager.send_help_resolved_notification(
            help_request_id=help_request.id,
            task_id=help_request.task_id,
            user_id=str(help_request.user_id),
            resolver_id=str(resolver_id),
            resolution_message=update_data.resolution_message or "도움 요청이 해결되었습니다."
        )
    )
    return help_request

def format_help_request_response(db: Session, help_request: HelpRequest):
    """
    도움 요청 정보를 응답 형식으로 포맷팅합니다.
    """
    # 요청자 정보 조회
    requester = db.query(User).filter(User.id == help_request.user_id).first()
    requester_name = requester.username if requester else "Unknown"
    
    # 태스크 정보 조회
    task = db.query(Task).filter(Task.id == help_request.task_id).first()
    task_title = task.title if task else "Unknown Task"
    
    # 해결자 정보 조회
    resolver_name = None
    if help_request.resolved_by:
        resolver = db.query(User).filter(User.id == help_request.resolved_by).first()
        resolver_name = resolver.username if resolver else "Unknown"
    
    return {
        "id": help_request.id,
        "task_id": help_request.task_id,
        "user_id": help_request.user_id,
        "username": requester_name,
        "task_title": task_title,
        "message": help_request.message,
        "requested_at": help_request.requested_at,
        "resolved": help_request.resolved,
        "resolved_at": help_request.resolved_at,
        "resolved_by": help_request.resolved_by,
        "resolver_name": resolver_name,
        "resolution_message": help_request.resolution_message
    }