# app/routers/websocket.py (완전 수정됨)
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.websocket_manager import manager
from app.utils.security import SECRET_KEY, ALGORITHM
from fastapi.concurrency import run_in_threadpool
from typing import Dict, Optional
import json
import traceback

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_user_from_token(token: str, db: Session):
    """
    토큰에서 사용자 정보를 추출합니다.
    """
    try:
        # JWT 토큰 디코딩
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"✅ 토큰 디코딩 성공: {payload}")
        
        subject = payload.get("sub")
        if subject is None:
            print("❌ 토큰에서 subject 추출 실패")
            return None
        
        print(f"🔍 Subject 값: '{subject}'")
        
        # ✅ subject가 숫자 문자열이면 user_id로 처리
        if subject.isdigit():
            user_id = int(subject)
            print(f"🔢 user_id로 사용자 조회: {user_id}")
            
            # user_id로 직접 조회
            from app.models.user import User
            user = await run_in_threadpool(
                lambda: db.query(User).filter(User.id == user_id).first()
            )
            
            if user:
                print(f"✅ 사용자 조회 성공: {user.username} (id: {user.id})")
                return user
            else:
                print(f"❌ user_id {user_id}에 해당하는 사용자 없음")
                return None
        else:
            # 문자열이면 username으로 처리
            print(f"👤 username으로 사용자 조회: '{subject}'")
            from app.crud.user import get_user_by_username
            user = await run_in_threadpool(get_user_by_username, db, subject)
            
            if user:
                print(f"✅ 사용자 조회 성공: {user.username} (id: {user.id})")
                return user
            else:
                print(f"❌ username '{subject}'에 해당하는 사용자 없음")
                return None
        
    except JWTError as e:
        print(f"❌ JWT 토큰 디코딩 실패: {e}")
        return None
    except Exception as e:
        print(f"❌ 사용자 정보 추출 중 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

@router.websocket("/ws/events")
async def events_websocket(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    서버 이벤트 전용 WebSocket 연결 (SSE 대체용)
    """
    print("🔌 Events WebSocket 엔드포인트 호출됨")
    
    # 연결 수락
    await websocket.accept()
    print("✅ Events WebSocket 연결 수락됨")
    
    user_id = None
    is_teacher = False
    
    try:
        print("🔐 인증 메시지 대기 중...")
        
        # 인증 메시지 수신
        try:
            auth_message = await websocket.receive_json()
            print(f"📨 인증 메시지 수신: {auth_message}")
        except Exception as e:
            print(f"❌ 인증 메시지 수신 실패: {e}")
            await websocket.send_json({"error": "Failed to receive auth message"})
            await websocket.close(code=1002)  # Protocol error
            return
        
        # 토큰 확인
        token = auth_message.get("token")
        if not token:
            print("❌ 토큰 없음")
            await websocket.send_json({"error": "Token required"})
            await websocket.close(code=1008)  # Policy violation
            return
        
        print(f"🔑 토큰 검증 시작: {token[:20]}...")
        
        # 사용자 확인
        user = await get_user_from_token(token, db)
        if not user:
            print("❌ 유효하지 않은 토큰 또는 사용자 없음")
            await websocket.send_json({"error": "Invalid token or user not found"})
            await websocket.close(code=1008)  # Policy violation
            return
        
        # 사용자 정보 설정
        user_id = str(user.id)
        is_teacher = user.is_teacher
        print(f"✅ 사용자 인증 성공: user_id={user_id}, is_teacher={is_teacher}")
        
        # 연결 관리자에 등록
        await manager.connect(websocket, user_id, is_teacher)
        print(f"✅ 연결 관리자에 등록 완료")
        
        # 연결 성공 메시지 전송
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to WebSocket server",
            "user_id": user_id,
            "is_teacher": is_teacher
        })
        print("📤 연결 성공 메시지 전송 완료")
        
        # 초기 데이터 전송
        await send_initial_data(websocket, db, user, is_teacher)
        
        # 연결 유지 루프
        print("🔄 WebSocket 연결 유지 루프 시작")
        while True:
            try:
                data = await websocket.receive_text()
                print(f"📨 클라이언트 메시지: {data}")
                
                # 핑/퐁 처리
                if data == "ping":
                    await websocket.send_text("pong")
                    print("📤 Pong 응답 전송")
                    
            except WebSocketDisconnect:
                print(f"🔌 클라이언트 연결 해제: user_id={user_id}")
                break
            except Exception as e:
                print(f"❌ 메시지 처리 중 오류: {e}")
                break
                
    except WebSocketDisconnect:
        print(f"🔌 WebSocket 연결 해제: user_id={user_id}")
    except Exception as e:
        print(f"❌ WebSocket 오류: {e}")
        traceback.print_exc()
        try:
            await websocket.send_json({"error": f"Server error: {str(e)}"})
            await websocket.close(code=1011)  # Internal error
        except:
            pass
    finally:
        # 연결 정리
        if user_id:
            await manager.disconnect(websocket, user_id, is_teacher)
            print(f"🧹 연결 정리 완료: user_id={user_id}")

async def send_initial_data(websocket: WebSocket, db: Session, user, is_teacher: bool):
    """
    사용자 권한에 따른 초기 데이터 전송
    """
    try:
        print(f"📊 초기 데이터 전송 시작 (is_teacher={is_teacher})")
        
        if is_teacher:
            # 교사용 초기 데이터
            await send_teacher_initial_data(websocket, db)
        else:
            # 학생용 초기 데이터
            await send_student_initial_data(websocket, db, user.id)
            
        print("✅ 초기 데이터 전송 완료")
        
    except Exception as e:
        print(f"❌ 초기 데이터 전송 중 오류: {e}")
        traceback.print_exc()
        # 초기 데이터 전송 실패해도 연결은 유지

async def send_teacher_initial_data(websocket: WebSocket, db: Session):
    """
    교사용 초기 데이터 전송
    """
    try:
        # 미해결 도움 요청 조회
        print("📊 교사용 미해결 도움 요청 조회 중...")
        try:
            from app.crud.help_request import get_help_requests
            help_requests = await run_in_threadpool(get_help_requests, db, resolved=False)
            
            if help_requests:
                help_requests_data = []
                for hr in help_requests:
                    help_requests_data.append({
                        "id": hr.id,
                        "task_id": hr.task_id,
                        "user_id": hr.user_id,
                        "message": hr.message,
                        "requested_at": hr.requested_at.isoformat() if hr.requested_at else None
                    })
                
                await websocket.send_json({
                    "type": "initial_help_requests",
                    "count": len(help_requests_data),
                    "data": help_requests_data
                })
                print(f"📤 도움 요청 데이터 전송: {len(help_requests_data)}개")
        except Exception as e:
            print(f"⚠️ 도움 요청 조회 실패 (무시하고 계속): {e}")
        
        # 지연된 태스크 조회
        print("📊 지연된 태스크 조회 중...")
        try:
            from app.crud.time_tracking import get_delayed_tasks
            delayed_tasks = await run_in_threadpool(get_delayed_tasks, db)
            
            if delayed_tasks:
                await websocket.send_json({
                    "type": "initial_delayed_tasks",
                    "count": len(delayed_tasks),
                    "data": delayed_tasks
                })
                print(f"📤 지연된 태스크 데이터 전송: {len(delayed_tasks)}개")
        except Exception as e:
            print(f"⚠️ 지연된 태스크 조회 실패 (무시하고 계속): {e}")
            
    except Exception as e:
        print(f"❌ 교사 초기 데이터 전송 오류: {e}")
        raise

async def send_student_initial_data(websocket: WebSocket, db: Session, user_id: int):
    """
    학생용 초기 데이터 전송
    """
    try:
        # 학생의 태스크 조회
        print("📊 학생 태스크 조회 중...")
        try:
            from app.crud.task import get_tasks_by_user_id
            user_tasks = await run_in_threadpool(get_tasks_by_user_id, db, user_id)
            
            if user_tasks:
                tasks_data = []
                for task in user_tasks:
                    tasks_data.append({
                        "id": task.id,
                        "title": task.title,
                        "stage": task.stage,
                        "is_delayed": getattr(task, 'is_delayed', False),
                        "help_needed": getattr(task, 'help_needed', False)
                    })
                
                await websocket.send_json({
                    "type": "initial_tasks",
                    "count": len(tasks_data),
                    "data": tasks_data
                })
                print(f"📤 학생 태스크 데이터 전송: {len(tasks_data)}개")
        except Exception as e:
            print(f"⚠️ 학생 태스크 조회 실패 (무시하고 계속): {e}")
            
    except Exception as e:
        print(f"❌ 학생 초기 데이터 전송 오류: {e}")
        raise

# 기존 /ws 엔드포인트는 간소화 (필요한 경우만)
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    기본 WebSocket 연결 (레거시 지원)
    """
    print("🔌 기본 WebSocket 엔드포인트 호출 - /ws/events 사용 권장")
    
    # /ws/events로 리다이렉트
    await events_websocket(websocket, db)