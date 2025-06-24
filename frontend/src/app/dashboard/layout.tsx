// src/app/dashboard/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import WebSocketStatus from '@/components/common/WebSocketStatus';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, loadUser, initializeAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log('🏁 DashboardLayout 마운트됨');
    
    // localStorage와 store 동기화
    initializeAuth();
    
    // 사용자 정보 로드 (WebSocket 연결도 포함)
    loadUser();
  }, [loadUser, initializeAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('🔒 인증되지 않은 사용자, 로그인 페이지로 이동');
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 중)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 공통 사이드바 컴포넌트 */}
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 상단 내비게이션 바 */}
        <Navbar />

        {/* 페이지 컨텐츠 영역 */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
          {children}
        </main>
      </div>
      
      {/* WebSocket 상태 표시 - 개발 환경에서만 */}
      {process.env.NODE_ENV === 'development' && <WebSocketStatus />}
    </div>
  );
}