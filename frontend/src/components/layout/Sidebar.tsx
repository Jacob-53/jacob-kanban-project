// src/components/layout/Sidebar.tsx
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
  CogIcon
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isTeacher = user?.is_teacher;
  
  // 모든 사용자에게 표시되는 네비게이션 항목
  const navigation = [
    { name: '대시보드', href: '/dashboard', icon: HomeIcon },
    { name: '작업 목록', href: '/tasks', icon: ClipboardDocumentListIcon },
    { name: '통계', href: '/statistics', icon: ChartBarIcon },
  ];
  
  // 도움 요청 관련 항목 (교사와 학생에게 다르게 표시)
  const helpRequestItem = isTeacher 
    ? { name: '도움 요청 관리', href: '/help-requests', icon: QuestionMarkCircleIcon }
    : { name: '도움 요청하기', href: '/help-requests', icon: QuestionMarkCircleIcon };
  
  // 교사에게만 표시되는 네비게이션 항목
  const teacherNavigation = [
    { name: '학생 관리', href: '/users', icon: UserGroupIcon },
    { name: '설정', href: '/settings', icon: CogIcon },
  ];
  
  // 네비게이션 항목 결합
  const allNavigation = [...navigation, helpRequestItem];
  
  // 교사인 경우 추가 항목 포함
  if (isTeacher) {
    allNavigation.push(...teacherNavigation);
  }

  return (
    <div className="w-64 bg-indigo-700 text-white flex flex-col h-full">
      <div className="p-4 border-b border-indigo-800">
        <h2 className="text-xl font-bold">Jacob Kanban</h2>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {allNavigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm ${
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
      <div className="p-4 border-t border-indigo-800">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="inline-block h-8 w-8 rounded-full bg-indigo-500 text-white text-center font-medium leading-8">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user?.username || '사용자'}</p>
            <p className="text-xs text-indigo-200">{user?.is_teacher ? '교사' : '학생'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}