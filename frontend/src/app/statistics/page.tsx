// src/app/statistics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useStatisticsStore } from '@/store/statisticsStore';
import { useAuthStore } from '@/store/authStore';
import { useHelpRequestStore } from '@/store/helpRequestStore';

export default function StatisticsPage() {
  const { 
    delayedTasks, 
    classStatistics, 
    isLoading, 
    error, 
    fetchDelayedTasks, 
    fetchClassStatistics,
    checkDelays 
  } = useStatisticsStore();
  
  const { helpRequests, fetchHelpRequests } = useHelpRequestStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      fetchClassStatistics();
      fetchDelayedTasks();
      fetchHelpRequests();
    }
  }, [user]);

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchClassStatistics(),
        fetchDelayedTasks(),
        fetchHelpRequests(),
        checkDelays(100)
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const pendingHelpRequests = helpRequests.filter(hr => !hr.resolved);
  const resolvedHelpRequests = helpRequests.filter(hr => hr.resolved);

  if (user?.role === 'student') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600">접근 권한이 없습니다</h2>
          <p className="text-gray-500 mt-2">이 페이지는 교사 및 관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading && !classStatistics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === 'admin' ? '전체 통계' : '내 반 통계'}
        </h1>
        <button
          onClick={handleRefreshData}
          disabled={refreshing}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-md transition-colors
            ${refreshing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
            }
          `}
        >
          {refreshing ? '새로고침 중...' : '데이터 새로고침'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 전체 통계 카드 */}
      {classStatistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="전체 학생"
            value={classStatistics.total_students}
            icon="👥"
            color="bg-blue-500"
          />
          <StatCard
            title="전체 태스크"
            value={classStatistics.total_tasks}
            icon="📋"
            color="bg-green-500"
          />
          <StatCard
            title="완료된 태스크"
            value={classStatistics.completed_tasks}
            icon="✅"
            color="bg-emerald-500"
          />
          <StatCard
            title="지연된 태스크"
            value={classStatistics.delayed_tasks}
            icon="⚠️"
            color="bg-red-500"
          />
        </div>
      )}

      {/* 도움 요청 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="전체 도움 요청"
          value={helpRequests.length}
          icon="🆘"
          color="bg-purple-500"
        />
        <StatCard
          title="대기 중인 요청"
          value={pendingHelpRequests.length}
          icon="⏳"
          color="bg-yellow-500"
        />
        <StatCard
          title="해결된 요청"
          value={resolvedHelpRequests.length}
          icon="✅"
          color="bg-green-500"
        />
      </div>

      {/* 학생별 진행 상황 */}
      {classStatistics && classStatistics.students_progress.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">학생별 진행 상황</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학생 이름
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
                    진행률
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classStatistics.students_progress.map((student) => (
                  <tr key={student.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.total_tasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.completed_tasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${student.delayed_tasks > 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                        }
                      `}>
                        {student.delayed_tasks}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${student.help_requests > 0 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                        }
                      `}>
                        {student.help_requests}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${student.progress_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {student.progress_percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 지연된 태스크 목록 */}
      {delayedTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            지연된 태스크 ({delayedTasks.length}개)
          </h2>
          <div className="space-y-3">
            {delayedTasks.map((task) => (
              <div 
                key={task.task_id} 
                className="border border-red-200 rounded-lg p-4 bg-red-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-600">학생: {task.username}</p>
                    <p className="text-sm text-gray-600">현재 단계: {task.current_stage}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">
                      {Math.round(task.delay_percentage)}% 지연
                    </div>
                    <div className="text-xs text-gray-500">
                      예상: {task.expected_time}분 | 경과: {Math.round(task.elapsed_time)}분
                    </div>
                    <div className="text-xs text-gray-400">
                      시작: {new Date(task.started_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 도움 요청 */}
      {pendingHelpRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            대기 중인 도움 요청 ({pendingHelpRequests.length}개)
          </h2>
          <div className="space-y-3">
            {pendingHelpRequests.slice(0, 5).map((request) => (
              <div 
                key={request.id} 
                className="border border-yellow-200 rounded-lg p-4 bg-yellow-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{request.task_title}</h3>
                    <p className="text-sm text-gray-600">학생: {request.username}</p>
                    {request.message && (
                      <p className="text-sm text-gray-700 mt-1 italic">
                        "{request.message}"
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {new Date(request.requested_at).toLocaleString('ko-KR')}
                    </div>
                    <button 
                      onClick={() => window.location.href = `/help-requests/${request.id}`}
                      className="mt-1 px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      확인
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {pendingHelpRequests.length > 5 && (
            <div className="mt-4 text-center">
              <button 
                onClick={() => window.location.href = '/help-requests'}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                모든 도움 요청 보기 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 빈 상태 */}
      {classStatistics && classStatistics.total_students === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              통계 데이터가 없습니다
            </h3>
            <p className="text-gray-600">
              {user?.role === 'admin' 
                ? '시스템에 등록된 학생이나 태스크가 없습니다.' 
                : '귀하의 반에 학생이나 태스크가 없습니다.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${color} rounded-lg p-3`}>
          <span className="text-white text-2xl">{icon}</span>
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-500">{title}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );
}