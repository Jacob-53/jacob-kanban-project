# app/utils/websocket_manager.py (개선됨)
from fastapi import WebSocket
from typing import Dict, List, Set, Optional, Any
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        # 모든 활성 연결 저장: user_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}
        
        # 교사 연결을 별도로 저장 (전체 알림용)
        self.teacher_connections: Set[WebSocket] = set()
        
        # 연결별 사용자 정보 저장: WebSocket -> user_info (역추적용)
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, is_teacher: bool):
        """
        새로운 WebSocket 연결을 등록합니다.
        ⚠️ 주의: websocket.accept()는 이미 라우터에서 호출되었음
        """
        try:
            print(f"🔌 WebSocket 연결 등록 시작: user_id={user_id}, is_teacher={is_teacher}")
            
            # 사용자별 연결 목록에 추가
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            
            # 교사인 경우 교사 연결 목록에도 추가
            if is_teacher:
                self.teacher_connections.add(websocket)
            
            # 연결 정보 저장 (역추적용)
            self.connection_info[websocket] = {
                "user_id": user_id,
                "is_teacher": is_teacher,
                "connected_at": datetime.utcnow()
            }
            
            print(f"✅ WebSocket 연결 등록 완료: user_id={user_id}")
            print(f"📊 현재 활성 사용자: {len(self.active_connections)}명, 교사: {len(self.teacher_connections)}명")
            
            # ⚠️ 연결 성공 메시지는 라우터에서 전송하므로 여기서는 제거
            
        except Exception as e:
            print(f"❌ WebSocket 연결 등록 실패: user_id={user_id}, error={e}")
            raise
    
    async def disconnect(self, websocket: WebSocket, user_id: str, is_teacher: bool):
        """
        WebSocket 연결을 해제합니다.
        """
        try:
            print(f"🔌 WebSocket 연결 해제 시작: user_id={user_id}")
            
            # 사용자별 연결 목록에서 제거
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                    print(f"✅ 사용자 연결 목록에서 제거: user_id={user_id}")
                
                # 빈 리스트인 경우 키 자체를 제거
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    print(f"✅ 사용자 연결 목록 삭제: user_id={user_id}")
            
            # 교사인 경우 교사 연결 목록에서도 제거
            if is_teacher and websocket in self.teacher_connections:
                self.teacher_connections.remove(websocket)
                print(f"✅ 교사 연결 목록에서 제거: user_id={user_id}")
            
            # 연결 정보 제거
            if websocket in self.connection_info:
                del self.connection_info[websocket]
                print(f"✅ 연결 정보 제거: user_id={user_id}")
            
            print(f"📊 연결 해제 후 활성 사용자: {len(self.active_connections)}명, 교사: {len(self.teacher_connections)}명")
            
        except Exception as e:
            print(f"❌ WebSocket 연결 해제 실패: user_id={user_id}, error={e}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        """
        특정 사용자에게 메시지를 전송합니다.
        """
        if user_id not in self.active_connections:
            print(f"⚠️ 사용자 {user_id}의 활성 연결이 없습니다")
            return
        
        disconnected_websockets = []
        success_count = 0
        
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_json(message)
                success_count += 1
                print(f"📤 개인 메시지 전송 성공: user_id={user_id}, type={message.get('type')}")
            except Exception as e:
                print(f"❌ 개인 메시지 전송 실패: user_id={user_id}, error={e}")
                disconnected_websockets.append(websocket)
        
        # 끊어진 연결 정리
        await self._cleanup_disconnected_websockets(disconnected_websockets)
        
        print(f"📊 개인 메시지 전송 완료: {success_count}/{len(self.active_connections[user_id])}개 성공")
    
    async def broadcast_to_teachers(self, message: dict):
        """
        모든 교사에게 메시지를 브로드캐스트합니다.
        """
        if not self.teacher_connections:
            print("⚠️ 활성 교사 연결이 없습니다")
            return
        
        disconnected_websockets = []
        success_count = 0
        
        # 복사본을 사용하여 순회 중 수정 방지
        teacher_connections_copy = list(self.teacher_connections)
        
        for websocket in teacher_connections_copy:
            try:
                await websocket.send_json(message)
                success_count += 1
            except Exception as e:
                print(f"❌ 교사 브로드캐스트 실패: error={e}")
                disconnected_websockets.append(websocket)
        
        # 끊어진 연결 정리
        await self._cleanup_disconnected_websockets(disconnected_websockets)
        
        print(f"📤 교사 브로드캐스트 완료: {success_count}/{len(teacher_connections_copy)}명, type={message.get('type')}")
    
    async def _cleanup_disconnected_websockets(self, disconnected_websockets: List[WebSocket]):
        """
        끊어진 WebSocket 연결들을 정리합니다.
        """
        for websocket in disconnected_websockets:
            try:
                # 연결 정보에서 사용자 ID와 교사 여부 찾기
                conn_info = self.connection_info.get(websocket)
                if conn_info:
                    user_id = conn_info["user_id"]
                    is_teacher = conn_info["is_teacher"]
                    await self.disconnect(websocket, user_id, is_teacher)
                else:
                    # 연결 정보가 없는 경우 강제로 모든 목록에서 제거
                    print("⚠️ 연결 정보가 없는 WebSocket 발견, 강제 정리 중...")
                    
                    # 모든 사용자 연결에서 제거
                    for uid, connections in list(self.active_connections.items()):
                        if websocket in connections:
                            connections.remove(websocket)
                            if not connections:
                                del self.active_connections[uid]
                    
                    # 교사 연결에서 제거
                    if websocket in self.teacher_connections:
                        self.teacher_connections.remove(websocket)
                    
                    # 연결 정보에서 제거
                    if websocket in self.connection_info:
                        del self.connection_info[websocket]
                        
            except Exception as e:
                print(f"❌ 끊어진 연결 정리 실패: error={e}")
    
    async def send_task_update(self, task_id: int, user_id: str, update_type: str, data: dict):
        """
        태스크 업데이트 메시지를 전송합니다.
        """
        message = {
            "type": "task_update",
            "update_type": update_type,
            "task_id": task_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
        
        print(f"📤 태스크 업데이트 전송: task_id={task_id}, type={update_type}")
        
        # 태스크 소유자에게 전송
        await self.send_personal_message(message, user_id)
        
        # 교사들에게도 전송
        await self.broadcast_to_teachers(message)
    
    async def send_help_request_notification(self, help_request_id: int, task_id: int, 
                                           user_id: str, message: str):
        """
        도움 요청 알림을 전송합니다.
        """
        notification = {
            "type": "help_request_notification",
            "help_request_id": help_request_id,
            "task_id": task_id,
            "user_id": user_id,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print(f"📤 도움 요청 알림 전송: help_request_id={help_request_id}")
        
        # 교사들에게 알림
        await self.broadcast_to_teachers(notification)
    
    async def send_help_resolved_notification(self, help_request_id: int, task_id: int, 
                                            user_id: str, resolver_id: str, 
                                            resolution_message: str):
        """
        도움 요청 해결 알림을 전송합니다.
        """
        notification = {
            "type": "help_request_resolved",
            "help_request_id": help_request_id,
            "task_id": task_id,
            "resolver_id": resolver_id,
            "resolution_message": resolution_message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print(f"📤 도움 요청 해결 알림 전송: help_request_id={help_request_id}")
        
        # 요청자에게 알림
        await self.send_personal_message(notification, user_id)
        
        # 교사들에게도 알림 (모니터링용)
        teacher_notification = {
            "type": "help_request_resolved_info",
            "help_request_id": help_request_id,
            "task_id": task_id,
            "user_id": user_id,
            "resolver_id": resolver_id,
            "resolution_message": resolution_message,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_teachers(teacher_notification)
    
    async def send_delay_notification(self, task_id: int, user_id: str, 
                                    expected_time: int, elapsed_time: float):
        """
        시간 초과 알림을 전송합니다.
        """
        notification = {
            "type": "delay_warning",
            "task_id": task_id,
            "expected_time": expected_time,
            "elapsed_time": elapsed_time,
            "percentage": round((elapsed_time / expected_time) * 100, 1),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print(f"📤 지연 알림 전송: task_id={task_id}, percentage={notification['percentage']}%")
        
        # 태스크 소유자에게 전송
        await self.send_personal_message(notification, user_id)
        
        # 교사들에게도 전송
        await self.broadcast_to_teachers(notification)
    
    # === 추가 유틸리티 메서드들 ===
    
    def get_active_user_count(self) -> int:
        """활성 사용자 수를 반환합니다."""
        return len(self.active_connections)
    
    def get_teacher_count(self) -> int:
        """활성 교사 수를 반환합니다."""
        return len(self.teacher_connections)
    
    def is_user_connected(self, user_id: str) -> bool:
        """특정 사용자가 연결되어 있는지 확인합니다."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0
    
    async def get_connection_stats(self) -> dict:
        """연결 통계를 반환합니다."""
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        
        return {
            "active_users": self.get_active_user_count(),
            "active_teachers": self.get_teacher_count(),
            "total_connections": total_connections,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def ping_all_connections(self):
        """모든 연결에 핑을 전송하여 살아있는지 확인합니다."""
        ping_message = {
            "type": "ping",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        disconnected_websockets = []
        
        # 모든 연결에 핑 전송
        for user_id, connections in self.active_connections.items():
            for websocket in connections:
                try:
                    await websocket.send_json(ping_message)
                except Exception:
                    disconnected_websockets.append(websocket)
        
        # 끊어진 연결 정리
        if disconnected_websockets:
            print(f"🧹 핑 테스트 결과: {len(disconnected_websockets)}개 연결 정리 중...")
            await self._cleanup_disconnected_websockets(disconnected_websockets)

# 전역 연결 관리자 인스턴스 생성
manager = ConnectionManager()

# 편의 함수들 (기존 코드와의 호환성을 위해)
async def send_to_user(user_id: str, message: dict):
    """사용자에게 메시지 전송 (편의 함수)"""
    await manager.send_personal_message(message, user_id)

async def broadcast_to_teachers(message: dict):
    """교사들에게 브로드캐스트 (편의 함수)"""
    await manager.broadcast_to_teachers(message)