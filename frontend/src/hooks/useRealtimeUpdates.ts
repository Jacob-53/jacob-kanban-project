// src/hooks/useRealtimeUpdates.ts (폴링 방식 대체)
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { useHelpRequestStore } from '@/store/helpRequestStore';
import { webSocketService } from '@/lib/websocket';

interface RealtimeOptions {
  enableWebSocket?: boolean;
  pollingInterval?: number; // ms
  enablePolling?: boolean;
}

export function useRealtimeUpdates(options: RealtimeOptions = {}) {
  const {
    enableWebSocket = true,
    pollingInterval = 10000, // 10초
    enablePolling = true
  } = options;

  const { isAuthenticated, user } = useAuthStore();
  const { fetchTasks } = useTaskStore();
  const { fetchHelpRequests } = useHelpRequestStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // 인증되지 않으면 모든 업데이트 중지
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wsCheckRef.current) {
        clearTimeout(wsCheckRef.current);
        wsCheckRef.current = null;
      }
      return;
    }

    // WebSocket 연결 상태 체크 후 폴링 여부 결정
    const checkWebSocketAndStartPolling = () => {
      if (enableWebSocket && webSocketService.isConnected()) {
        console.log('🔌 WebSocket이 연결되어 있어 폴링 사용 안함');
        return;
      }

      if (enablePolling) {
        console.log('🔄 WebSocket 미연결로 폴링 시작 (간격:', pollingInterval, 'ms)');
        
        intervalRef.current = setInterval(async () => {
          // WebSocket이 연결되면 폴링 중지
          if (enableWebSocket && webSocketService.isConnected()) {
            console.log('🔌 WebSocket 연결됨, 폴링 중지');
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }

          console.log('🔄 폴링으로 데이터 업데이트 중...');
          
          try {
            // Task 데이터 업데이트
            await fetchTasks();
            
            // 교사인 경우 도움 요청도 업데이트
            if (user?.is_teacher || user?.role === 'admin') {
              await fetchHelpRequests();
            }
          } catch (error) {
            console.error('폴링 업데이트 오류:', error);
          }
        }, pollingInterval);
      }
    };

    // 3초 후에 WebSocket 상태를 체크하고 폴링 시작 여부 결정
    wsCheckRef.current = setTimeout(checkWebSocketAndStartPolling, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wsCheckRef.current) {
        clearTimeout(wsCheckRef.current);
        wsCheckRef.current = null;
      }
    };
  }, [isAuthenticated, user, fetchTasks, fetchHelpRequests, enableWebSocket, enablePolling, pollingInterval]);

  // WebSocket 연결 상태 반환
  return {
    isWebSocketConnected: enableWebSocket ? webSocketService.isConnected() : false,
    isPollingActive: !!intervalRef.current
  };
}

// 간편 사용법
export function useSimpleRealtimeUpdates() {
  return useRealtimeUpdates({
    enableWebSocket: true,
    enablePolling: true,
    pollingInterval: 10000 // 10초
  });
}