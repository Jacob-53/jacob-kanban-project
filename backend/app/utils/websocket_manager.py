# app/utils/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List, Set, Optional
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        # 모든 활성 연결 저장
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # 교사 연결을 별도로 저장 (전체 알림용)
        self.teacher_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, user_id: str, is_teacher: bool):
        """
        새로운 WebSocket 연결을 등록합니다.
        """
        #await websocket.accept()
        
        # 사용자별 연결 목록에 추가
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # 교사인 경우 교사 연결 목록에도 추가
        if is_teacher:
            self.teacher_connections.add(websocket)
        
        # 연결 성공 메시지 전송
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to WebSocket server"
        })
    
    async def disconnect(self, websocket: WebSocket, user_id: str, is_teacher: bool):
        """
        WebSocket 연결을 해제합니다.
        """
        # 사용자별 연결 목록에서 제거
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            # 빈 리스트인 경우 키 자체를 제거
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # 교사인 경우 교사 연결 목록에서도 제거
        if is_teacher and websocket in self.teacher_connections:
            self.teacher_connections.remove(websocket)
    
    async def send_personal_message(self, message: dict, user_id: str):
        """
        특정 사용자에게 메시지를 전송합니다.
        """
        if user_id in self.active_connections:
            disconnected_websockets = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_json(message)
                except Exception:
                    disconnected_websockets.append(websocket)
            
            # 끊어진 연결 제거
            for websocket in disconnected_websockets:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
    
    async def broadcast_to_teachers(self, message: dict):
        """
        모든 교사에게 메시지를 브로드캐스트합니다.
        """
        disconnected_websockets = []
        for websocket in self.teacher_connections:
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected_websockets.append(websocket)
        
        # 끊어진 연결 제거
        for websocket in disconnected_websockets:
            if websocket in self.teacher_connections:
                self.teacher_connections.remove(websocket)
    
    async def send_task_update(self, task_id: int, user_id: str, update_type: str, data: dict):
        """
        태스크 업데이트 메시지를 전송합니다.
        """
        message = {
            "type": "task_update",
            "update_type": update_type,
            "task_id": task_id,
            "data": data
        }
        
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
            "type": "help_request",
            "help_request_id": help_request_id,
            "task_id": task_id,
            "user_id": user_id,
            "message": message
        }
        
        # 교사들에게 알림
        await self.broadcast_to_teachers(notification)
    
    async def send_help_resolved_notification(self, help_request_id: int, task_id: int, 
                                            user_id: str, resolver_id: str, 
                                            resolution_message: str):
        """
        도움 요청 해결 알림을 전송합니다.
        """
        notification = {
            "type": "help_resolved",
            "help_request_id": help_request_id,
            "task_id": task_id,
            "resolution_message": resolution_message
        }
        
        # 요청자에게 알림
        await self.send_personal_message(notification, user_id)
    
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
            "percentage": round((elapsed_time / expected_time) * 100, 1)
        }
        
        # 태스크 소유자에게 전송
        await self.send_personal_message(notification, user_id)
        
        # 교사들에게도 전송
        await self.broadcast_to_teachers(notification)

# 전역 연결 관리자 인스턴스 생성
manager = ConnectionManager()