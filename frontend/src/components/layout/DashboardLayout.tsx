// src/components/layout/DashboardLayout.tsx
'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { webSocketService } from '@/lib/websocket';
import { getAuthToken, debugTokenStorage } from '@/utils/tokenUtils';
import { useSimpleRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, token, isAuthenticated, isLoading, loadUser, error } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  
  // WebSocket 관련 상태
  const wsConnected = useRef(false);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  // 실시간 업데이트 (WebSocket + 폴링 백업)
  const { isWebSocketConnected, isPollingActive } = useSimpleRealtimeUpdates();

  // 초기 인증 체크 (한 번만 실행)
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 DashboardLayout 초기 인증 체크');
      
      // 이미 체크했거나 로그인 페이지에 있으면 건너뛰기
      if (authChecked || pathname?.startsWith('/auth/')) {
        setAuthChecked(true);
        return;
      }

      try {
        // localStorage에서 토큰 확인
        const storedToken = localStorage.getItem('token');
        console.log('🔑 저장된 토큰:', !!storedToken);
        
        if (storedToken && !user) {
          console.log('📡 사용자 정보 로드 시작');
          await loadUser();
        }
      } catch (error) {
        console.error('❌ 인증 체크 오류:', error);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []); // 의존성 배열을 비워서 한 번만 실행

  // 인증 상태 변경시 리디렉션 (체크 완료 후에만)
  useEffect(() => {
    if (!authChecked || isLoading) return;

    const storedToken = localStorage.getItem('token');
    
    console.log('🔍 인증 상태 체크:', {
      authChecked,
      isLoading,
      isAuthenticated,
      hasToken: !!storedToken,
      hasUser: !!user,
      pathname,
      wsConnected: isWebSocketConnected,
      pollingActive: isPollingActive
    });

    // 토큰이 없거나 인증되지 않은 경우 로그인으로 이동
    if (!storedToken || !isAuthenticated) {
      if (!pathname?.startsWith('/auth/')) {
        console.log('🚫 인증되지 않음, 로그인 페이지로 이동');
        router.push('/auth/login');
      }
    }
  }, [authChecked, isLoading, isAuthenticated, user, router, pathname]);

  // WebSocket 연결 관리 (인증 완료 후에만)
  useEffect(() => {
    // 인증이 완료되고 사용자 정보가 있을 때만 WebSocket 연결
    if (authChecked && isAuthenticated && user && !wsConnected.current) {
      console.log('🚀 WebSocket 연결 시작 (사용자:', user.username, ')');
      
      // 토큰 디버깅
      debugTokenStorage();
      
      // 토큰 추출
      const authToken = getAuthToken();
      if (authToken) {
        wsConnected.current = true;
        webSocketService.connect(authToken);
        
        // 주기적으로 ping 보내기 (30초마다)
        pingInterval.current = setInterval(() => {
          if (webSocketService.isConnected()) {
            webSocketService.ping();
          }
        }, 30000);
      } else {
        console.error('🚫 WebSocket 연결용 토큰을 찾을 수 없음');
      }
    }

    // 인증이 해제되면 WebSocket 연결도 해제
    if (!isAuthenticated && wsConnected.current) {
      console.log('🔌 인증 해제로 인한 WebSocket 연결 해제');
      webSocketService.disconnect();
      wsConnected.current = false;
      
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = null;
      }
    }

    // 클린업
    return () => {
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = null;
      }
    };
  }, [authChecked, isAuthenticated, user]);

  // 컴포넌트 언마운트 시 WebSocket 연결 해제
  useEffect(() => {
    return () => {
      console.log('🔌 DashboardLayout 언마운트로 인한 WebSocket 연결 해제');
      webSocketService.disconnect();
      wsConnected.current = false;
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = null;
      }
    };
  }, []);

  // 아직 인증 체크가 완료되지 않았거나 로딩 중
  if (!authChecked || isLoading) {
    return (
      <div className="h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 에러가 있는 경우
  if (error) {
    return (
      <div className="h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">연결 오류</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              useAuthStore.setState({ error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (리디렉션이 진행 중)
  if (!isAuthenticated || !user) {
    return null;
  }

  // 정상적으로 인증된 경우 대시보드 레이아웃 렌더링
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 사이드바 */}
      <Sidebar />
      
      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}