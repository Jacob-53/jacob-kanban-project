// src/components/layout/DashboardLayout.tsx
'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const router = useRouter();

  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    const checkAuth = async () => {
      await loadUser();
      
      // 로컬 스토리지에 토큰이 있는지 확인
      const token = localStorage.getItem('token');
      const isAuth = useAuthStore.getState().isAuthenticated;
      
      console.log('DashboardLayout 인증 확인:', { 
        token: !!token, 
        isAuthenticated: isAuth 
      });
      
      // 인증되지 않은 경우 로그인 페이지로 리디렉션
      if (!token || !isAuth) {
        console.log('인증되지 않음, 로그인 페이지로 리디렉션');
        router.push('/auth/login');
      }
    };
    
    checkAuth();
  }, [loadUser, router]);

  // 인증 상태 변경 감지
  useEffect(() => {
    console.log('인증 상태 변경:', isAuthenticated);
    
    if (!isLoading && !isAuthenticated) {
      console.log('인증 상태 확인: 인증되지 않음, 로그인 페이지로 리디렉션');
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 로딩 중인 경우 로딩 인디케이터 표시
  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // 인증되지 않은 경우 빈 컴포넌트 반환 (리디렉션이 진행 중일 것임)
  if (!isAuthenticated) {
    return null;
  }

  // 인증된 경우 대시보드 레이아웃 표시
  return (
      <div className="flex flex-col flex-1 h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
          {children}
        </main>
      </div>
  );
}