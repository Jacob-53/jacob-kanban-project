// src/components/common/HelpRequestDetail.tsx
'use client';

import { useState, useEffect } from 'react';
import { HelpRequest, useHelpRequestStore } from '@/store/helpRequestStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface Props {
  id: number;
}

// 해결 요청 페이로드 타입 정의
interface ResolveHelpRequestPayload {
  resolution_message?: string;
}

export default function HelpRequestDetail({ id }: Props) {
  const [helpRequest, setHelpRequest] = useState<HelpRequest | null>(null);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getHelpRequest } = useHelpRequestStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchHelpRequest = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const request = await getHelpRequest(id);
        if (request) {
          setHelpRequest(request);
        } else {
          setError('도움 요청을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('도움 요청 조회 오류:', error);
        setError('도움 요청을 가져오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHelpRequest();
  }, [id, getHelpRequest]);

  // 직접 API 호출로 해결 처리
  const handleResolve = async () => {
    if (!helpRequest || isResolving) return;

    setIsResolving(true);
    setError(null);
    
    try {
      console.log('🔄 도움 요청 해결 시작:', helpRequest.id);
      
      // 직접 API 호출 (콘솔에서 성공한 방식과 동일)
      const response = await api.put(`/help-requests/${helpRequest.id}/resolve`, {
        resolution_message: resolutionMessage || "문제가 해결되었습니다."
      });

      console.log('✅ 해결 처리 성공:', response.data);

      // 상태 업데이트
      const updatedRequest = {
        ...helpRequest,
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolver_name: user?.username || '알 수 없음',
        resolution_message: resolutionMessage || "문제가 해결되었습니다."
      };

      setHelpRequest(updatedRequest);
      setResolutionMessage('');
      
      // 성공 메시지
      alert('도움 요청이 성공적으로 해결되었습니다!');

    } catch (error: any) {
      console.error('❌ 해결 처리 오류:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          '도움 요청 해결 중 오류가 발생했습니다.';
      setError(errorMessage);
      alert(`오류: ${errorMessage}`);
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !helpRequest) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error || '도움 요청을 찾을 수 없습니다.'}
      </div>
    );
  }

  const canResolve = user?.role === 'teacher' || user?.role === 'admin';
  const isResolved = helpRequest.resolved;

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            도움 요청 상세
          </h1>
          <span className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${isResolved 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
            }
          `}>
            {isResolved ? '해결됨' : '대기 중'}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              요청자
            </label>
            <p className="text-gray-900">{helpRequest.username}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              태스크
            </label>
            <p className="text-gray-900">{helpRequest.task_title}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              요청 시간
            </label>
            <p className="text-gray-600">
              {new Date(helpRequest.requested_at).toLocaleString('ko-KR')}
            </p>
          </div>

          {helpRequest.message && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                요청 내용
              </label>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {helpRequest.message}
                </p>
              </div>
            </div>
          )}

          {isResolved && (
            <div className="border-t pt-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    해결자
                  </label>
                  <p className="text-gray-900">
                    {helpRequest.resolver_name || '알 수 없음'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    해결 시간
                  </label>
                  <p className="text-gray-600">
                    {helpRequest.resolved_at 
                      ? new Date(helpRequest.resolved_at).toLocaleString('ko-KR')
                      : '알 수 없음'
                    }
                  </p>
                </div>

                {helpRequest.resolution_message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      해결 내용
                    </label>
                    <div className="bg-green-50 rounded-md p-3">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {helpRequest.resolution_message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 오류 메시지 표시 */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {canResolve && !isResolved && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            도움 요청 해결
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="resolution" className="block text-sm font-medium text-gray-700 mb-1">
                해결 내용 (선택사항)
              </label>
              <textarea
                id="resolution"
                value={resolutionMessage}
                onChange={(e) => setResolutionMessage(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 
                          bg-white text-gray-900 placeholder-gray-500
                          dark:bg-gray-100 dark:text-gray-900 dark:border-gray-400"
                rows={4}
                placeholder="해결 방법이나 답변을 입력하세요..."
                disabled={isResolving}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleResolve}
                disabled={isResolving}
                className={`
                  px-4 py-2 text-sm font-medium text-white rounded-md
                  ${isResolving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }
                `}
              >
                {isResolving ? '해결 중...' : '해결 완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!canResolve && !isResolved && (
        <div className="border-t pt-6">
          <p className="text-gray-600 text-center">
            교사 또는 관리자만 도움 요청을 해결할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}