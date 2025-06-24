// src/app/help-requests/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHelpRequestStore } from '@/store/helpRequestStore';
import { useAuthStore } from '@/store/authStore';

export default function HelpRequestsPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const { helpRequests, isLoading, error, fetchHelpRequests } = useHelpRequestStore();
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchHelpRequests();
  }, []);

  const filteredRequests = helpRequests.filter(request => {
    switch (filter) {
      case 'pending':
        return !request.resolved;
      case 'resolved':
        return request.resolved;
      default:
        return true;
    }
  });

  const handleRequestClick = (id: number) => {
    router.push(`/help-requests/${id}`);
  };

  const getStatusBadge = (resolved: boolean) => (
    <span className={`
      px-2 py-1 rounded-full text-xs font-medium
      ${resolved 
        ? 'bg-green-100 text-green-800' 
        : 'bg-yellow-100 text-yellow-800'
      }
    `}>
      {resolved ? '해결됨' : '대기 중'}
    </span>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && helpRequests.length === 0) {
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
          도움 요청 관리
        </h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            대기 중
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${filter === 'resolved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            해결됨
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              {filter === 'all' && '도움 요청이 없습니다.'}
              {filter === 'pending' && '대기 중인 도움 요청이 없습니다.'}
              {filter === 'resolved' && '해결된 도움 요청이 없습니다.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    요청자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    태스크
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    요청 내용
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    요청 시간
                  </th>
                  {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      해결자
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    onClick={() => handleRequestClick(request.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.task_title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {request.message || '메시지 없음'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.resolved)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatDate(request.requested_at)}
                      </div>
                    </td>
                    {(user?.role === 'teacher' || user?.role === 'admin') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {request.resolved 
                            ? (request.resolver_name || '알 수 없음')
                            : '-'
                          }
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 통계 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {helpRequests.length}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">전체 요청</div>
              <div className="text-lg font-bold text-gray-900">
                {helpRequests.length}개
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {helpRequests.filter(r => !r.resolved).length}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">대기 중</div>
              <div className="text-lg font-bold text-gray-900">
                {helpRequests.filter(r => !r.resolved).length}개
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {helpRequests.filter(r => r.resolved).length}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">해결됨</div>
              <div className="text-lg font-bold text-gray-900">
                {helpRequests.filter(r => r.resolved).length}개
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}