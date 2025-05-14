// src/components/layout/Navbar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
// 최신 버전의 heroicons import 경로
import { BellIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  
  const handleLogout = () => {
    console.log('로그아웃 시도', user);
    logout();
    console.log('로그아웃 완료, 리디렉션');
    router.push('/auth/login');
  };
  
  console.log('Navbar 렌더링, 사용자:', user);
  
  return (
    <nav className="bg-white shadow-sm px-4 py-2 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-lg font-bold text-gray-800">교육용 칸반 보드</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="text-gray-500 hover:text-gray-700">
          <BellIcon className="h-6 w-6" />
        </button>
        
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
          >
            <UserCircleIcon className="h-8 w-8 text-gray-600" />
            <span className="font-medium">{user?.username || '사용자'}</span>
          </button>
          
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.username || '사용자'}</p>
                <p className="text-xs text-gray-500">{user?.is_teacher ? '교사' : '학생'}</p>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}