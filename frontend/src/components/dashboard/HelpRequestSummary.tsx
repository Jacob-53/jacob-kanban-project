// src/components/dashboard/HelpRequestSummary.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { HelpRequest } from '@/types';

export default function HelpRequestSummary() {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  const isTeacher = user?.is_teacher;
  
  useEffect(() => {
    const fetchHelpRequests = async () => {
      setIsLoading(true);
      try {
        // 교사면 미해결 요청, 학생이면 자신의 요청 가져오기
        const url = isTeacher 
          ? '/help-requests/?resolved=false' 
          : '/help-requests/';
        
        const response = await api.get(url);
        // 최근 5개만 표시
        setHelpRequests(response.data.slice(0, 5));
      } catch (error: any) {
        console.error('도움 요청 가져오기 실패:', error);
        setError(error.response?.data?.detail || '도움 요청을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHelpRequests();
  }, [isTeacher]);
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">도움 요청</h2>
        <div className="animate-pulse flex justify-center py-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MM/dd HH:mm', { locale: ko });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {isTeacher ? '대기 중인 도움 요청' : '내 도움 요청'}
        </h2>
        <button
          onClick={() => router.push('/help-requests')}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          전체보기 →
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {helpRequests.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          {isTeacher 
            ? '대기 중인 도움 요청이 없습니다.'
            : '도움 요청 내역이 없습니다.'}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {helpRequests.map((request) => (
            <li key={request.id} className="py-3">
              <div className="flex justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    작업 #{request.task_id}
                    {request.resolved && (
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        해결됨
                      </span>
                    )}
                    {!request.resolved && (
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        대기 중
                      </span>
                    )}
                  </p>
                  {request.message && (
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {request.message}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(request.requested_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => router.push(isTeacher ? '/help-requests' : '/tasks')}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isTeacher ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-yellow-600 hover:bg-yellow-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isTeacher ? 'focus:ring-indigo-500' : 'focus:ring-yellow-500'
          }`}
        >
          {isTeacher ? '도움 요청 관리하기' : '새 도움 요청하기'}
        </button>
      </div>
    </div>
  );
}