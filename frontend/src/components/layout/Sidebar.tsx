// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  HomeIcon,
  ClipboardListIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
  CogIcon
} from '@heroicons/react/outline';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  
  const isTeacher = user?.is_teacher;
  
  const navigation = [
    { name: '대시보드', href: '/dashboard', icon: HomeIcon },
    { name: '칸반 보드', href: '/tasks', icon: ClipboardListIcon },
    { name: '통계', href: '/statistics', icon: ChartBarIcon },
    { name: '도움 요청', href: '/help-requests', icon: QuestionMarkCircleIcon },
  ];
  
  // 교사만 볼 수 있는 메뉴
  const teacherNavigation = [
    { name: '사용자 관리', href: '/users', icon: UserGroupIcon },
    { name: '설정', href: '/settings', icon: CogIcon },
  ];
  
  const allNavigation = isTeacher 
    ? [...navigation, ...teacherNavigation] 
    : navigation;
  
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
              {user?.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-indigo-200">{user?.is_teacher ? '교사' : '학생'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}