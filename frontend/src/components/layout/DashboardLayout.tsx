// src/components/layout/DashboardLayout.tsx
'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const router = useRouter();

  // 첫 마운트 시 사용자 정보 로드
  useEffect(() => {
    console.log('DashboardLayout 마운트, 사용자 정보 로드 시도');
    const initAuth = async () => {
      await loadUser();
      setInitialLoadDone(true);
    };
    initAuth();
  }, [loadUser]);

  // 인증 상태 변경 시 리다이렉트
  useEffect(() => {
    if (initialLoadDone && !isLoading && !isAuthenticated) {
      console.log('인증되지 않음, 로그인 페이지로 이동');
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, initialLoadDone, router]);

  // 로딩 중이거나 초기 로드가 완료되지 않았으면 로딩 표시
  if (isLoading || !initialLoadDone) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // 인증되지 않았으면 아무것도 렌더링하지 않음
  if (!isAuthenticated) {
    return null; // 리다이렉트 대기
  }

  // 인증된 경우 대시보드 레이아웃 표시
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}