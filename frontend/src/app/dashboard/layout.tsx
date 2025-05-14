// src/app/dashboard/layout.tsx
'use client';
import Sidebar from '@/components/layout/Sidebar';
import Navbar  from '@/components/layout/Navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    </div>
  );
}