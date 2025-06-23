// src/components/common/WebSocketStatus.tsx
'use client';

import { useAuthStore } from '@/store/authStore';
import { webSocketService } from '@/lib/websocket';

export default function WebSocketStatus() {
  const { isWebSocketConnected, user } = useAuthStore();

  const handleReconnect = () => {
    console.log('🔄 수동 WebSocket 재연결 시도');
    webSocketService.disconnect();
    setTimeout(() => {
      webSocketService.connect();
    }, 1000);
  };

  const handlePing = () => {
    console.log('🏓 수동 핑 전송');
    webSocketService.ping();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* WebSocket 연결 상태 */}
      <div className={`px-3 py-2 rounded-lg text-xs font-medium shadow-lg ${
        isWebSocketConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isWebSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span>WebSocket: {isWebSocketConnected ? '연결됨' : '연결 안됨'}</span>
        </div>
        
        {user && (
          <div className="text-xs text-gray-600 mt-1">
            사용자: {user.username} ({user.role})
          </div>
        )}
      </div>

      {/* 개발 환경에서만 표시되는 컨트롤 버튼들 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
          <div className="text-xs font-medium text-gray-700 mb-2">WebSocket 디버그</div>
          <div className="space-y-1">
            <button
              onClick={handleReconnect}
              className="w-full px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
            >
              재연결
            </button>
            <button
              onClick={handlePing}
              className="w-full px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
              disabled={!isWebSocketConnected}
            >
              핑 전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// === Navbar에 추가할 수 있는 더 간단한 버전 ===
export function WebSocketStatusBadge() {
  const { isWebSocketConnected, connectWebSocket } = useAuthStore();

  const handleReconnect = async () => {
    try {
      await connectWebSocket();
    } catch (err) {
      console.error('수동 재연결 실패:', err);
    }
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
          className="flex items-center space-x-1 text-amber-600 hover:text-amber-700 transition-colors"
          title="실시간 연결 해제됨 - 클릭하여 재연결"
        >
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <span className="text-xs hidden sm:inline">재연결</span>
        </button>
      )}
    </div>
  );
}