'use client';

import { useState, useEffect } from 'react';
import { HelpRequest, ResolveHelpRequestPayload } from '@/api/helpRequests';
import { useHelpRequests } from '@/hooks/useHelpRequests';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  id: number;
}

export default function HelpRequestDetail({ id }: Props) {
  const { token } = useAuth();
  const { fetchById, resolve } = useHelpRequests(token);

  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchById(id).then(data => setRequest(data));
  }, [fetchById, id]);

  if (!request) return <p>로딩 중…</p>;

  const handleResolve = async () => {
    setResolving(true);
    setError(null);
    try {
      await resolve(id, { resolved: true, resolution_message: resolutionMessage });
      // 상태가 바뀐 최신 객체를 다시 불러오거나, 모달 닫기 등 처리
      setRequest(prev => prev && { ...prev, resolved: true, resolver_name: 'You', resolution_message: resolutionMessage });
    } catch (err: any) {
      setError(err.message || '해결 처리 중 에러');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded">
      <h2 className="text-xl font-medium">[{request.id}] {request.task_title}</h2>
      <p><strong>요청자:</strong> {request.username}</p>
      <p><strong>메시지:</strong> {request.message}</p>
      <p><strong>요청 일시:</strong> {new Date(request.requested_at).toLocaleString()}</p>

      {request.resolved ? (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <p><strong>해결됨:</strong> {new Date(request.resolved_at!).toLocaleString()}</p>
          <p><strong>담당 교사:</strong> {request.resolver_name}</p>
          <p><strong>답변:</strong> {request.resolution_message}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            placeholder="해결 내용을 입력하세요."
            value={resolutionMessage}
            onChange={e => setResolutionMessage(e.target.value)}
          />
          {error && <p className="text-red-600">{error}</p>}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className={`px-4 py-2 rounded ${resolving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
          >
            {resolving ? '처리 중…' : '해결 완료'}
          </button>
        </div>
      )}
    </div>
  );
}
