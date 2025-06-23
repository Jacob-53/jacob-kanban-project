// src/components/providers/WebSocketProvider.tsx (올바른 수정 버전)
'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { webSocketService } from '@/lib/websocket';

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export default function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user, token, isAuthenticated } = useAuthStore();
  const connectionAttempted = useRef(false);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 인증된 사용자이고 아직 연결을 시도하지 않은 경우
    if (isAuthenticated && token && !connectionAttempted.current) {
      console.log('🚀 WebSocket 연결 시작 (사용자:', user?.username, ')');
      connectionAttempted.current = true;
      
      // ✅ WebSocket 연결 (파라미터 없이 호출)
      webSocketService.connect();
      
      // ✅ 주기적으로 ping 보내기 (30초마다) - 올바른 메서드명
      pingInterval.current = setInterval(() => {
        if (webSocketService.isConnected()) {
          webSocketService.ping(); // ✅ sendPing() → ping()로 수정
        }
      }, 30000);
    }

    // 로그아웃 시 연결 해제
    if (!isAuthenticated && connectionAttempted.current) {
      console.log('🔌 로그아웃으로 인한 WebSocket 연결 해제');
      webSocketService.disconnect();
      connectionAttempted.current = false;
      
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = null;
      }
    }
  }, [isAuthenticated, token, user]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
      webSocketService.disconnect();
    };
  }, []);

  return <>{children}</>;
}