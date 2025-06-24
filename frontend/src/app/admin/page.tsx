//src/app/admin/page.tsx (수정된 버전)
'use client';

import { useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
  UsersIcon,
  AcademicCapIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  PlayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, href }) => {
  const router = useRouter();
  
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white', 
    yellow: 'bg-yellow-500 text-white',
    purple: 'bg-purple-500 text-white',
    red: 'bg-red-500 text-white',
    indigo: 'bg-indigo-500 text-white'
  };

  return (
    <div 
      onClick={() => router.push(href)}
      className={`${colorClasses[color as keyof typeof colorClasses]} p-6 rounded-lg shadow cursor-pointer hover:opacity-90 transition-opacity`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <Icon className="h-8 w-8 opacity-80" />
      </div>
    </div>
  );
};

export default function AdminPage() {
  const { user } = useAuthStore();
  const { systemStats, fetchSystemStats, isLoadingStats, error } = useAdminStore();
  const router = useRouter();

  useEffect(() => {
    // 관리자 권한 확인
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // 시스템 통계 데이터 가져오기
    fetchSystemStats();
  }, [user, router, fetchSystemStats]);

  // 로딩 상태
  if (isLoadingStats) {
    return (
      <div className="h-64 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // 관리자 권한 확인
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // 안전한 데이터 처리 (기존 store의 SystemStats 인터페이스에 맞춤)
  const displayStats = {
    total_users: systemStats?.total_users || 0,
    total_students: systemStats?.total_students || 0,
    total_teachers: systemStats?.total_teachers || 0,
    total_admins: systemStats?.total_admins || 0,
    total_classes: systemStats?.total_classes || 0,
    total_tasks: systemStats?.total_tasks || 0,
    completed_tasks: systemStats?.completed_tasks || 0,
    pending_help_requests: systemStats?.pending_help_requests || 0,
    active_users_today: systemStats?.active_users_today || 0,
  };

  // 진행 중인 태스크 계산
  const activeTasks = displayStats.total_tasks - displayStats.completed_tasks;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          관리자 대시보드
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          시스템 전체 현황을 관리하고 모니터링하세요.
        </p>
      </div>

      {/* 주요 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="전체 사용자"
          value={displayStats.total_users}
          icon={UsersIcon}
          color="blue"
          href="/admin/users"
        />
        
        <StatCard
          title="전체 반"
          value={displayStats.total_classes}
          icon={AcademicCapIcon}
          color="green"
          href="/admin/classes"
        />
        
        <StatCard
          title="전체 태스크"
          value={displayStats.total_tasks}
          icon={ClipboardDocumentListIcon}
          color="purple"
          href="/tasks"
        />
        
        <StatCard
          title="완료된 태스크"
          value={displayStats.completed_tasks}
          icon={CheckCircleIcon}
          color="green"
          href="/tasks?filter=completed"
        />
      </div>

      {/* 세부 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="학생 수"
          value={displayStats.total_students}
          icon={UsersIcon}
          color="blue"
          href="/admin/users?role=student"
        />
        
        <StatCard
          title="교사 수"
          value={displayStats.total_teachers}
          icon={AcademicCapIcon}
          color="indigo"
          href="/admin/users?role=teacher"
        />
        
        <StatCard
          title="진행 중인 태스크"
          value={activeTasks}
          icon={PlayIcon}
          color="yellow"
          href="/tasks?filter=active"
        />
      </div>

      {/* 알림 및 액션이 필요한 항목들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 승인 대기 및 도움 요청 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            🚨 즉시 처리 필요
          </h2>
          
          <div className="space-y-4">
            <div 
              onClick={() => router.push('/admin/teachers')}
              className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100"
            >
              <div className="flex items-center">
                <CheckBadgeIcon className="h-5 w-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium text-yellow-800">승인 대기 교사</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                {/* 실제로는 pendingTeachers.length를 사용해야 함 */}
                -
              </span>
            </div>

            <div 
              onClick={() => router.push('/help-requests')}
              className="flex justify-between items-center p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
            >
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
                <span className="text-sm font-medium text-red-800">대기 중인 도움 요청</span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {displayStats.pending_help_requests}
              </span>
            </div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            ⚡ 빠른 관리 액션
          </h2>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/admin/users')}
              className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">사용자 관리</h3>
                  <p className="text-sm text-gray-500">사용자 생성, 수정, 삭제</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/classes')}
              className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="flex items-center">
                <AcademicCapIcon className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">반 관리</h3>
                  <p className="text-sm text-gray-500">반 생성, 학생 배정</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/teachers')}
              className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="flex items-center">
                <CheckBadgeIcon className="h-5 w-5 text-yellow-500 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">교사 승인</h3>
                  <p className="text-sm text-gray-500">대기 중인 교사 승인</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 시스템 요약 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          📊 시스템 요약
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{displayStats.total_users}</p>
            <p className="text-sm text-gray-600">총 사용자</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{displayStats.total_classes}</p>
            <p className="text-sm text-gray-600">활성 반</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {displayStats.total_tasks > 0 
                ? Math.round((displayStats.completed_tasks / displayStats.total_tasks) * 100)
                : 0}%
            </p>
            <p className="text-sm text-gray-600">완료율</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{displayStats.active_users_today}</p>
            <p className="text-sm text-gray-600">오늘 활성 사용자</p>
          </div>
        </div>
      </div>
    </div>
  );
}