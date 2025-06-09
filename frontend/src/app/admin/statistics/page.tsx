//app/admin/statistics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

interface SystemStats {
  total_users?: number;
  total_teachers?: number;
  total_students?: number;
  total_classes?: number;
  total_tasks?: number;
  pending_help_requests?: number;
  delayed_tasks?: number;
  active_users_today?: number;
}

interface ClassStats {
  id: number;
  name: string;
  student_count: number;
  total_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  help_requests: number;
}

interface UserStats {
  id: number;
  username: string;
  role: string;
  class_name?: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  help_requests: number;
  last_activity?: string;
}

// StatCard 컴포넌트 정의
interface StatCardProps {
  title: string;
  value: number | undefined | null;
  icon: string;
  color: string;
  urgent?: boolean;
}

function StatCard({ title, value, icon, color, urgent = false }: StatCardProps) {
  // value가 undefined, null, NaN인 경우 0으로 처리
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${urgent ? 'ring-2 ring-yellow-400' : ''}`}>
      <div className="flex items-center">
        <div className={`${color} rounded-lg p-3 text-white text-2xl`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-semibold ${urgent ? 'text-red-600' : 'text-gray-900'}`}>
            {safeValue.toLocaleString()}
          </p>
        </div>
      </div>
      {urgent && safeValue > 0 && (
        <div className="mt-2 text-xs text-yellow-600 font-medium">
          ⚠️ 즉시 확인 필요
        </div>
      )}
    </div>
  );
}

export default function AdminStatisticsPage() {
  const { user } = useAuthStore();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // 관리자 권한 확인
  if (user && user.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">
            <h3 className="font-medium">접근 권한 없음</h3>
            <p className="mt-1">관리자만 접근할 수 있는 페이지입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    if (!user) {
      setError('사용자 정보가 없습니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };

      // 1. 전체 사용자 목록 조회
      const usersResponse = await fetch(`${API_URL}/users/`, { headers });
      if (!usersResponse.ok) throw new Error('사용자 데이터를 불러올 수 없습니다');
      const users = await usersResponse.json();

      // 2. 전체 태스크 목록 조회
      const tasksResponse = await fetch(`${API_URL}/tasks/`, { headers });
      if (!tasksResponse.ok) throw new Error('태스크 데이터를 불러올 수 없습니다');
      const tasks = await tasksResponse.json();

      // 3. 도움 요청 목록 조회
      const helpRequestsResponse = await fetch(`${API_URL}/help-requests/`, { headers });
      if (!helpRequestsResponse.ok) throw new Error('도움 요청 데이터를 불러올 수 없습니다');
      const helpRequests = await helpRequestsResponse.json();

      // 4. 반 목록 조회
      const classesResponse = await fetch(`${API_URL}/classes/`, { headers });
      if (!classesResponse.ok) throw new Error('반 데이터를 불러올 수 없습니다');
      const classes = await classesResponse.json();

      // 시스템 통계 계산
      const systemStats: SystemStats = {
        total_users: users.length || 0,
        total_teachers: users.filter((u: any) => u.is_teacher).length || 0,
        total_students: users.filter((u: any) => !u.is_teacher).length || 0,
        total_classes: classes.length || 0,
        total_tasks: tasks.length || 0,
        pending_help_requests: helpRequests.filter((hr: any) => !hr.resolved).length || 0,
        delayed_tasks: tasks.filter((t: any) => t.is_delayed).length || 0,
        active_users_today: users.length || 0 // 임시로 전체 사용자 수로 설정
      };

      // 반별 통계 계산
      const classStatsData: ClassStats[] = classes.map((cls: any) => {
        const classUsers = users.filter((u: any) => u.class_id === cls.id);
        const classTasks = tasks.filter((t: any) => 
          classUsers.some((u: any) => u.id === t.user_id)
        );
        const classHelpRequests = helpRequests.filter((hr: any) => 
          classTasks.some((t: any) => t.id === hr.task_id)
        );

        return {
          id: cls.id,
          name: cls.name,
          student_count: classUsers.filter((u: any) => !u.is_teacher).length,
          total_tasks: classTasks.length,
          completed_tasks: classTasks.filter((t: any) => t.stage === 'done').length,
          delayed_tasks: classTasks.filter((t: any) => t.is_delayed).length,
          help_requests: classHelpRequests.filter((hr: any) => !hr.resolved).length
        };
      });

      // 사용자별 통계 계산 (상위 10명)
      const userStatsData: UserStats[] = users.slice(0, 10).map((user: any) => {
        const userTasks = tasks.filter((t: any) => t.user_id === user.id);
        const completedTasks = userTasks.filter((t: any) => t.stage === 'done');
        const userHelpRequests = helpRequests.filter((hr: any) => 
          userTasks.some((t: any) => t.id === hr.task_id)
        );

        return {
          id: user.id,
          username: user.username,
          role: user.role || (user.is_teacher ? 'teacher' : 'student'),
          class_name: user.class_name,
          total_tasks: userTasks.length,
          completed_tasks: completedTasks.length,
          completion_rate: userTasks.length > 0 
            ? Math.round((completedTasks.length / userTasks.length) * 100)
            : 0,
          help_requests: userHelpRequests.length,
          last_activity: user.last_activity
        };
      });

      setSystemStats(systemStats);
      setClassStats(classStatsData);
      setUserStats(userStatsData);

      /* 실제 API 호출 코드 (준비되면 주석 해제)
      
      // 시스템 전체 통계
      const systemResponse = await fetch(`${API_URL}/admin/stats/overview`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (!systemResponse.ok) {
        throw new Error('시스템 통계를 불러올 수 없습니다');
      }

      const systemData = await systemResponse.json();
      setSystemStats(systemData);

      // 반별 통계
      const classResponse = await fetch(`${API_URL}/admin/classes`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (classResponse.ok) {
        const classData = await classResponse.json();
        setClassStats(classData);
      }

      // 사용자별 통계
      const userResponse = await fetch(`${API_URL}/admin/users?limit=10`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserStats(userData);
      }
      
      */

    } catch (error: any) {
      console.error('통계 데이터 로드 오류:', error);
      setError(error.message || '통계 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">시스템 통계</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">시스템 통계</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">
            <h3 className="font-medium">오류 발생</h3>
            <p className="mt-1">{error}</p>
          </div>
          <button
            onClick={fetchAllStats}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">시스템 통계</h1>
        <button
          onClick={fetchAllStats}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>

      {/* 시스템 전체 통계 카드 */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="전체 사용자"
            value={systemStats.total_users}
            icon="👥"
            color="bg-blue-500"
          />
          <StatCard
            title="교사"
            value={systemStats.total_teachers}
            icon="👨‍🏫"
            color="bg-green-500"
          />
          <StatCard
            title="학생"
            value={systemStats.total_students}
            icon="🎓"
            color="bg-purple-500"
          />
          <StatCard
            title="반 수"
            value={systemStats.total_classes}
            icon="🏫"
            color="bg-orange-500"
          />
          <StatCard
            title="전체 태스크"
            value={systemStats.total_tasks}
            icon="📋"
            color="bg-indigo-500"
          />
          <StatCard
            title="대기 중인 도움 요청"
            value={systemStats.pending_help_requests}
            icon="🆘"
            color="bg-yellow-500"
            urgent={(systemStats.pending_help_requests || 0) > 0}
          />
          <StatCard
            title="지연된 태스크"
            value={systemStats.delayed_tasks}
            icon="⏰"
            color="bg-red-500"
            urgent={(systemStats.delayed_tasks || 0) > 0}
          />
          <StatCard
            title="오늘 활성 사용자"
            value={systemStats.active_users_today}
            icon="✅"
            color="bg-emerald-500"
          />
        </div>
      )}

      {/* 반별 통계 */}
      {classStats.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">반별 통계</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    반 이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학생 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전체 태스크
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    완료된 태스크
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    지연된 태스크
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    도움 요청
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    완료율
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classStats.map((classItem) => (
                  <tr key={classItem.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {classItem.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.student_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.total_tasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.completed_tasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={classItem.delayed_tasks > 0 ? 'text-red-600 font-medium' : ''}>
                        {classItem.delayed_tasks}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={classItem.help_requests > 0 ? 'text-yellow-600 font-medium' : ''}>
                        {classItem.help_requests}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.total_tasks > 0 
                        ? Math.round((classItem.completed_tasks / classItem.total_tasks) * 100)
                        : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 사용자별 통계 */}
      {userStats.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">활성 사용자 현황</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    반
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전체 태스크
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    완료 태스크
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    완료율
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userStats.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'admin' ? '관리자' : 
                         user.role === 'teacher' ? '교사' : '학생'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.class_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.total_tasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.completed_tasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.completion_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}