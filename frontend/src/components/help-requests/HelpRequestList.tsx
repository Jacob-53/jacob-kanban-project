// src/components/help-requests/HelpRequestList.tsx

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { HelpRequest } from '@/types';

export default function HelpRequestList() {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const router = useRouter();
  const { user } = useAuthStore();
  
  // 도움 요청 목록 가져오기
  const fetchHelpRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 도움 요청 목록 API 호출 (resolved 상태에 따라 필터링)
      const resolved = activeTab === 'resolved';
      const response = await api.get(`/help-requests/?resolved=${resolved}`);
      setHelpRequests(response.data);
    } catch (error: any) {
      console.error('도움 요청 목록 가져오기 실패:', error);
      setError(error.response?.data?.detail || '도움 요청 목록을 가져오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 도움 요청 해결 처리
  const resolveHelpRequest = async (helpRequestId: number) => {
    try {
      await api.put(`/help-requests/${helpRequestId}/resolve`, {
        resolved: true,
        resolution_message: '도움 요청이 해결되었습니다.'
      });
      // 목록 갱신
      fetchHelpRequests();
    } catch (error: any) {
      console.error('도움 요청 해결 처리 실패:', error);
      alert(error.response?.data?.detail || '도움 요청 해결 처리에 실패했습니다.');
    }
  };
  
  // 컴포넌트 마운트 시 도움 요청 목록 가져오기
  useEffect(() => {
    fetchHelpRequests();
  }, [activeTab]);
  
  // 도움이 필요한 태스크로 이동 처리
  const navigateToTask = (taskId: number) => {
    router.push(`/tasks/${taskId}`);
  };
  
  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  // 교사가 아니면 접근 권한 없음 메시지 표시
  if (!user?.is_teacher) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <p className="font-bold">접근 권한이 없습니다</p>
        <p>이 페이지는 교사만 접근할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">도움 요청 목록</h1>
      
      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'pending'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          대기 중인 요청
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'resolved'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('resolved')}
        >
          해결된 요청
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {helpRequests.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500">
            {activeTab === 'pending' ? '대기 중인 도움 요청이 없습니다.' : '해결된 도움 요청이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {helpRequests.map((helpRequest) => (
              <li key={helpRequest.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        학생: {helpRequest.user_id} 
                      </p>
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        요청 ID: {helpRequest.id}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-gray-900" onClick={() => navigateToTask(helpRequest.task_id)} style={{ cursor: 'pointer' }}>
                      작업: Task #{helpRequest.task_id}
                    </p>
                    {helpRequest.message && (
                      <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        "{helpRequest.message}"
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      요청 시간: {formatDate(helpRequest.requested_at)}
                    </p>
                    {helpRequest.resolved && helpRequest.resolved_at && (
                      <p className="mt-1 text-xs text-gray-500">
                        해결 시간: {formatDate(helpRequest.resolved_at)}
                      </p>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {!helpRequest.resolved ? (
                      <button
                        onClick={() => resolveHelpRequest(helpRequest.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        해결 완료
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-green-800 bg-green-100">
                        해결됨
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}