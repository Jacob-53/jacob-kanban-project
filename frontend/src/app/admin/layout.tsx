// src/app/admin/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const [permissionChecked, setPermissionChecked] = useState(false);

  // 관리자 권한 체크
  useEffect(() => {
    // 로딩이 완료되고 인증 상태가 확정된 후에만 권한 체크
    if (isLoading || permissionChecked) return;

    console.log('🔍 관리자 권한 체크:', { 
      isAuthenticated, 
      userRole: user?.role,
      username: user?.username 
    });

    if (!isAuthenticated || !user) {
      console.log('🚫 관리자 페이지: 인증되지 않음');
      router.push('/auth/login');
      return;
    }

    if (user.role !== 'admin') {
      console.log('🚫 관리자 페이지: 권한 없음 - 현재 역할:', user.role);
      // 교사면 대시보드로, 학생이면 칸반보드로
      if (user.role === 'teacher') {
        router.push('/dashboard');
      } else {
        router.push('/tasks');
      }
      return;
    }

    console.log('✅ 관리자 페이지: 접근 허용');
    setPermissionChecked(true);
  }, [isAuthenticated, user, isLoading, router, permissionChecked]);

  // 로딩 중이거나 권한 체크 전
  if (isLoading || !permissionChecked) {
    return (
      <div className="h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isLoading ? '로딩 중...' : '권한 확인 중...'}
          </p>
        </div>
      </div>
    );
  }

  // 권한이 없는 경우 (리디렉션이 진행 중)
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return null;
  }

  // 관리자인 경우 DashboardLayout으로 감싸서 반환
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}