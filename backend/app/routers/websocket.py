# app/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.websocket_manager import manager
from app.utils.security import SECRET_KEY, ALGORITHM
from typing import Dict, Optional
import json

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_user_from_token(token: str, db: Session):
    """
    토큰에서 사용자 정보를 추출합니다.
    """
    try:
        # 동기 함수를 비동기적으로 실행
        from fastapi.concurrency import run_in_threadpool
        
        async def async_decode():
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                print(f"토큰 디코딩 성공: {payload}")  # 디버깅
                return payload
            except JWTError as e:
                print(f"토큰 디코딩 실패: {e}")  # 디버깅
                return None
        
        payload = await async_decode()
        if payload is None:
            return None
        
        username = payload.get("sub")
        if username is None:
            return None
        
        # 동기 DB 쿼리를 비동기적으로 실행
        from app.crud.user import get_user_by_username
        user = await run_in_threadpool(get_user_by_username, db, username)
        print(f"사용자 조회 결과: {user.username if user else None}")  # 디버깅
        return user
    except Exception as e:
        print(f"사용자 정보 추출 중 오류: {e}")  # 디버깅
        import traceback
        traceback.print_exc()
        return None

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    WebSocket 연결을 처리합니다.
    """
    # 연결 수락
    await websocket.accept()
    
    # 인증 메시지 대기
    try:
        auth_message = await websocket.receive_json()
        
        # 토큰 확인
        token = auth_message.get("token")
        if not token:
            await websocket.send_json({"error": "Authentication required"})
            await websocket.close(code=1008)  # Policy violation
            return
        
        # 사용자 확인
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.send_json({"error": "Invalid token"})
            await websocket.close(code=1008)  # Policy violation
            return
        
        # 연결 관리자에 연결 등록
        user_id = str(user.id)
        is_teacher = user.is_teacher
        
        await manager.connect(websocket, user_id, is_teacher)
        
        # 연결 유지 및 메시지 수신
        try:
            while True:
                # 클라이언트로부터 메시지 수신 (핑/퐁 처리 등)
                data = await websocket.receive_text()
                
                # 핑 처리
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            # 연결 해제 시 처리
            await manager.disconnect(websocket, user_id, is_teacher)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close(code=1011)  # Internal error

@router.websocket("/ws/events")
async def events_websocket(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    서버 이벤트 전용 WebSocket 연결 (SSE 대체용)
    """
    print("Events WebSocket 엔드포인트 호출됨")  # 추가 디버깅
    
    # 연결 수락
    await websocket.accept()
    print("Events WebSocket 연결 수락됨")  # 추가 디버깅
    
    # 인증 메시지 대기
    try:
        print("인증 메시지 대기 중...")  # 추가 디버깅
        auth_message = await websocket.receive_json()
        print(f"인증 메시지 수신: {auth_message}")  # 추가 디버깅
        
        # 토큰 확인
        token = auth_message.get("token")
        if not token:
            print("토큰 없음")  # 추가 디버깅
            await websocket.send_json({"error": "Authentication required"})
            await websocket.close(code=1008)
            return
        
        # 사용자 확인
        print(f"토큰으로 사용자 확인: {token[:10]}...")  # 추가 디버깅
        try:
            user = await get_user_from_token(token, db)
            print(f"사용자 확인 결과: {user.username if user else 'None'}")  # 추가 디버깅
        except Exception as e:
            print(f"사용자 확인 중 오류: {e}")  # 추가 디버깅
            await websocket.send_json({"error": f"User verification error: {str(e)}"})
            await websocket.close(code=1011)
            return
        
        if not user:
            print("유효하지 않은 토큰")  # 추가 디버깅
            await websocket.send_json({"error": "Invalid token"})
            await websocket.close(code=1008)
            return
        
        # 연결 관리자에 연결 등록 (accept 호출 제거)
        user_id = str(user.id)
        is_teacher = user.is_teacher
        print(f"연결 등록: user_id={user_id}, is_teacher={is_teacher}")  # 추가 디버깅
        
        # 직접 연결 등록
        if user_id not in manager.active_connections:
            manager.active_connections[user_id] = []
        manager.active_connections[user_id].append(websocket)
        
        if is_teacher:
            manager.teacher_connections.add(websocket)
        
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to WebSocket server"
        })
        
        # 권한별 초기 이벤트 전송 부분은 try/except로 감싸서 오류 처리
        try:
            print(f"초기 이벤트 전송 시작 (is_teacher={is_teacher})")  # 추가 디버깅
            if is_teacher:
                # 교사인 경우, 미해결 도움 요청과 지연된 태스크 정보를 초기에 전송
                from app.crud.help_request import get_help_requests
                from app.crud.time_tracking import get_delayed_tasks
                
                print("교사용 초기 데이터 조회 중...")  # 추가 디버깅
                # 미해결 도움 요청 조회
                help_requests = get_help_requests(db, resolved=False)
                print(f"미해결 도움 요청: {len(help_requests) if help_requests else 0}개")  # 추가 디버깅
                
                if help_requests:
                    help_requests_data = []
                    for hr in help_requests:
                        try:
                            help_requests_data.append({
                                "id": hr.id,
                                "task_id": hr.task_id,
                                "user_id": hr.user_id,
                                "message": hr.message,
                                "requested_at": hr.requested_at.isoformat() if hr.requested_at else None
                            })
                        except Exception as e:
                            print(f"도움 요청 데이터 변환 오류: {e}")  # 추가 디버깅
                    
                    await websocket.send_json({
                        "type": "initial_help_requests",
                        "count": len(help_requests_data),
                        "data": help_requests_data
                    })
                    print("도움 요청 데이터 전송 완료")  # 추가 디버깅
                
                # 지연된 태스크 조회
                try:
                    print("지연된 태스크 조회 중...")  # 추가 디버깅
                    delayed_tasks = get_delayed_tasks(db)
                    print(f"지연된 태스크: {len(delayed_tasks) if delayed_tasks else 0}개")  # 추가 디버깅
                    
                    if delayed_tasks:
                        await websocket.send_json({
                            "type": "initial_delayed_tasks",
                            "count": len(delayed_tasks),
                            "data": delayed_tasks
                        })
                        print("지연된 태스크 데이터 전송 완료")  # 추가 디버깅
                except Exception as e:
                    print(f"지연된 태스크 조회 오류: {e}")  # 추가 디버깅
            else:
                # 학생인 경우, 자신의 태스크 상태 정보를 초기에 전송
                from app.crud.task import get_tasks_by_user_id
                
                print("학생용 태스크 조회 중...")  # 추가 디버깅
                try:
                    user_tasks = get_tasks_by_user_id(db, user.id)
                    print(f"학생 태스크: {len(user_tasks) if user_tasks else 0}개")  # 추가 디버깅
                    
                    if user_tasks:
                        tasks_data = []
                        for task in user_tasks:
                            try:
                                tasks_data.append({
                                    "id": task.id,
                                    "title": task.title,
                                    "stage": task.stage,
                                    "is_delayed": task.is_delayed,
                                    "help_needed": task.help_needed
                                })
                            except Exception as e:
                                print(f"태스크 데이터 변환 오류: {e}")  # 추가 디버깅
                        
                        await websocket.send_json({
                            "type": "initial_tasks",
                            "count": len(tasks_data),
                            "data": tasks_data
                        })
                        print("학생 태스크 데이터 전송 완료")  # 추가 디버깅
                except Exception as e:
                    print(f"학생 태스크 조회 오류: {e}")  # 추가 디버깅
        except Exception as e:
            print(f"초기 이벤트 전송 중 오류: {e}")  # 추가 디버깅
            # 오류가 있어도 연결을 유지
        
        # 연결 유지
        try:
            print("WebSocket 연결 유지 루프 시작")  # 추가 디버깅
            while True:
                # 클라이언트로부터 메시지 수신 (핑/퐁 처리 등)
                data = await websocket.receive_text()
                print(f"클라이언트 메시지 수신: {data}")  # 추가 디버깅
                
                # 핑 처리
                if data == "ping":
                    await websocket.send_text("pong")
                    print("Pong 응답 전송")  # 추가 디버깅
        except WebSocketDisconnect:
            # 연결 해제 시 처리
            print(f"WebSocket 연결 해제: user_id={user_id}")  # 추가 디버깅
            if user_id in manager.active_connections:
                if websocket in manager.active_connections[user_id]:
                    manager.active_connections[user_id].remove(websocket)
                if not manager.active_connections[user_id]:
                    del manager.active_connections[user_id]
            
            if is_teacher and websocket in manager.teacher_connections:
                manager.teacher_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket events error: {e}")  # 일반 오류 로그
        import traceback
        traceback.print_exc()  # 상세 오류 스택 출력
        try:
            await websocket.close(code=1011)
        except:
            pass  # 이미 닫혀있을 수 있음