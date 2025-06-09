'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
  CogIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const getNavigationItems = (): NavigationItem[] => {
    if (!user) return [];

    // 공통 네비게이션
    const commonNavigation: NavigationItem[] = [
      { name: '대시보드', href: '/dashboard', icon: HomeIcon },
      { name: '태스크', href: '/tasks', icon: ClipboardDocumentListIcon },
    ];

    // 학생용 네비게이션
    const studentNavigation: NavigationItem[] = [
      ...commonNavigation,
      { name: '도움 요청', href: '/help-requests', icon: QuestionMarkCircleIcon },
    ];

    // 교사용 네비게이션
    const teacherNavigation: NavigationItem[] = [
      ...commonNavigation,
      { name: '통계', href: '/statistics', icon: ChartBarIcon },
      { name: '학생 관리', href: '/students', icon: UserGroupIcon },
      { name: '도움 요청', href: '/help-requests', icon: QuestionMarkCircleIcon },
    ];

    // 관리자용 네비게이션
    const adminNavigation: NavigationItem[] = [
      { name: '관리자 대시보드', href: '/admin', icon: ShieldCheckIcon },
      { name: '사용자 관리', href: '/admin/users', icon: UserGroupIcon },
      { name: '반 관리', href: '/admin/classes', icon: BuildingOfficeIcon },
      { name: '교사 승인', href: '/admin/teachers', icon: CheckBadgeIcon },
      { name: '시스템 통계', href: '/admin/statistics', icon: CircleStackIcon },
      { name: '설정', href: '/admin/settings', icon: CogIcon },
      // 구분선 역할
      { name: '---', href: '---', icon: HomeIcon },
      // 일반 사용자 메뉴도 접근 가능
      { name: '일반 대시보드', href: '/dashboard', icon: HomeIcon },
      { name: '태스크', href: '/tasks', icon: ClipboardDocumentListIcon },
      { name: '도움 요청', href: '/help-requests', icon: QuestionMarkCircleIcon },
    ];

    // 역할에 따른 네비게이션 반환
    switch (user.role) {
      case 'admin':
        return adminNavigation;
      case 'teacher':
        return teacherNavigation;
      case 'student':
        return studentNavigation;
      default:
        return commonNavigation;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="w-64 bg-indigo-700 text-white flex flex-col h-full">
      {/* 로고 */}
      <div className="p-4 border-b border-indigo-800">
        <h2 className="text-xl font-bold">Jacob Kanban</h2>
        {user?.role === 'admin' && (
          <p className="text-sm text-indigo-200">관리자 모드</p>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item) => {
            // 구분선 처리
            if (item.name === '---') {
              return (
                <li key="divider" className="py-2">
                  <div className="border-t border-indigo-600"></div>
                  <p className="text-xs text-indigo-300 mt-2 px-3">일반 메뉴</p>
                </li>
              );
            }

            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && item.href !== '/admin' && pathname?.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-indigo-800 text-white'
                      : 'text-indigo-100 hover:bg-indigo-600'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 하단 정보 */}
      <div className="p-4 border-t border-indigo-800">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="inline-block h-8 w-8 rounded-full bg-indigo-500 text-white text-center font-medium leading-8">
              {user?.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-indigo-200">
              {user?.role === 'admin' ? '관리자' : 
               user?.role === 'teacher' ? '교사' : 
               user?.role === 'student' ? '학생' : '사용자'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}