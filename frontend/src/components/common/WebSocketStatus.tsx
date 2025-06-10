// src/components/common/WebSocketStatus.tsx
'use client';

import { useAuthStore } from '@/store/authStore';
import { webSocketService } from '@/lib/websocket';

export default function WebSocketStatus() {
  const { isWebSocketConnected } = useAuthStore();

  if (!isWebSocketConnected) {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span>실시간 연결 해제됨</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-xs text-green-600">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span>실시간 연결됨</span>
    </div>
  );
}

// === Navbar에 추가할 수 있는 더 간단한 버전 ===
export function WebSocketStatusBadge() {
  const { isWebSocketConnected, connectWebSocket } = useAuthStore();

  const handleReconnect = () => {
    connectWebSocket().catch(err => {
      console.error('수동 재연결 실패:', err);
    });
  };

  return (
    <div className="flex items-center">
      {isWebSocketConnected ? (
        <div className="flex items-center space-x-1 text-green-600" title="실시간 연결됨">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs hidden sm:inline">실시간</span>
        </div>
      ) : (
        <button
          onClick={handleReconnect}
          className="flex items-center space-x-1 text-amber-600 hover:text-amber-700"
          title="실시간 연결 해제됨 - 클릭하여 재연결"
        >
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <span className="text-xs hidden sm:inline">재연결</span>
        </button>
      )}
    </div>
  );
}