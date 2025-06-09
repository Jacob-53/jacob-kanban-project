// src/components/layout/Sidebar.tsx
'use client';

import React from 'react'; // React import 추가
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useHelpRequestStore } from '@/store/helpRequestStore';

// 아이콘 컴포넌트들 (임시로 간단한 이모지 사용)
const Icons = {
  Home: () => <span className="text-lg">🏠</span>,
  Tasks: () => <span className="text-lg">📋</span>,
  Statistics: () => <span className="text-lg">📊</span>,
  Students: () => <span className="text-lg">👥</span>,
  HelpRequests: () => <span className="text-lg">🆘</span>,
  Users: () => <span className="text-lg">👤</span>,
  Settings: () => <span className="text-lg">⚙️</span>,
  Classes: () => <span className="text-lg">🏫</span>,
};

// 네비게이션 아이템 타입 정의 - React.ReactElement 또는 간단하게 React.FC로 변경
interface NavigationItem {
  name: string;
  href: string;
  icon: React.FC; // 또는 () => React.ReactElement
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  // 학생용 네비게이션
  const studentNavigation: NavigationItem[] = [
    { name: '대시보드', href: '/dashboard', icon: Icons.Home },
    { name: '내 태스크', href: '/tasks', icon: Icons.Tasks },
    { name: '도움 요청', href: '/help-requests', icon: Icons.HelpRequests },
  ];

  // 교사용 네비게이션
  const teacherNavigation: NavigationItem[] = [
    { name: '대시보드', href: '/dashboard', icon: Icons.Home },
    { name: '태스크 관리', href: '/tasks', icon: Icons.Tasks },
    { name: '학생 관리', href: '/students', icon: Icons.Students },
    { name: '통계', href: '/statistics', icon: Icons.Statistics },
    { name: '도움 요청', href: '/help-requests', icon: Icons.HelpRequests },
  ];

  // 관리자용 네비게이션
  const adminNavigation: NavigationItem[] = [
    { name: '대시보드', href: '/dashboard', icon: Icons.Home },
    { name: '태스크 관리', href: '/tasks', icon: Icons.Tasks },
    { name: '학생 관리', href: '/students', icon: Icons.Students },
    { name: '사용자 관리', href: '/users', icon: Icons.Users },
    { name: '반 관리', href: '/classes', icon: Icons.Classes },
    { name: '통계', href: '/statistics', icon: Icons.Statistics },
    { name: '도움 요청', href: '/help-requests', icon: Icons.HelpRequests },
    { name: '설정', href: '/settings', icon: Icons.Settings },
  ];

  // 역할에 따른 네비게이션 선택
  const getNavigationItems = (): NavigationItem[] => {
    if (!user?.role) return studentNavigation;
    
    switch (user.role) {
      case 'admin':
        return adminNavigation;
      case 'teacher':
        return teacherNavigation;
      case 'student':
      default:
        return studentNavigation;
    }
  };

  const navigationItems = getNavigationItems();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const getRoleBadge = () => {
    const roleColors: Record<string, string> = {
      admin: 'bg-red-500',
      teacher: 'bg-blue-500',
      student: 'bg-green-500',
    };

    const roleLabels: Record<string, string> = {
      admin: '관리자',
      teacher: '교사',
      student: '학생',
    };

    if (!user?.role) return null;

    return (
      <span className={`
        inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white
        ${roleColors[user.role] || 'bg-gray-500'}
      `}>
        {roleLabels[user.role] || '사용자'}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full w-64 bg-indigo-800 text-white">
      {/* 로고 및 제목 */}
      <div className="flex items-center justify-center h-16 px-4 bg-indigo-900">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📚</span>
          <span className="text-xl font-bold">Jacob Kanban</span>
        </div>
      </div>

      {/* 사용자 정보 */}
      <div className="px-4 py-4 border-b border-indigo-700">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {user?.username || '사용자'}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              {getRoleBadge()}
              {user?.class_name && (
                <span className="text-xs text-indigo-200">
                  {user.class_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          const IconComponent = item.icon; // 컴포넌트를 변수로 추출
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150
                ${active
                  ? 'bg-indigo-700 text-white'
                  : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
                }
              `}
            >
              <span className="mr-3">
                <IconComponent />
              </span>
              <span>{item.name}</span>
              
              {/* 알림 배지 (도움 요청 페이지용) */}
              {item.href === '/help-requests' && user?.role !== 'student' && (
                <span className="ml-auto">
                  <PendingHelpRequestsBadge />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 하단 정보 */}
      <div className="px-4 py-4 border-t border-indigo-700">
        <div className="text-xs text-indigo-200 text-center">
          <div>Jacob Kanban v1.0</div>
          <div className="mt-1">교육용 칸반 보드 시스템</div>
        </div>
      </div>
    </div>
  );
}

// 대기 중인 도움 요청 수를 보여주는 배지 컴포넌트
function PendingHelpRequestsBadge() {
  const { helpRequests } = useHelpRequestStore();
  
  const pendingCount = helpRequests.filter(hr => !hr.resolved).length;
  
  if (pendingCount === 0) return null;

  return (
    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-indigo-800 bg-yellow-400 rounded-full">
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  );
}