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
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const router = useRouter();

  // 마운트 시 사용자 정보 로드
  useEffect(() => {
    const checkAuth = async () => {
      console.log('현재 인증 상태:', isAuthenticated);
      
      if (!isAuthenticated) {
        // 토큰이 있으면 사용자 정보 로드 시도
        if (localStorage.getItem('token')) {
          console.log('토큰 존재. 사용자 정보 로드 시도');
          await loadUser();
          
          // 로드 후에도 인증이 안 되면 로그인 페이지로
          if (!useAuthStore.getState().isAuthenticated) {
            console.log('토큰 있지만 유효하지 않음. 로그인 페이지로 이동');
            router.push('/auth/login');
          }
        } else {
          // 토큰 없으면 로그인 페이지로
          console.log('토큰 없음. 로그인 페이지로 이동');
          router.push('/auth/login');
        }
      }
    };
    
    checkAuth();
  }, [isAuthenticated, loadUser, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 인증 확인 중 또는 실패 시 빈 화면 (로그인 페이지로 리디렉션 대기)
    return null;
  }

  // 인증된 경우 레이아웃 표시
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