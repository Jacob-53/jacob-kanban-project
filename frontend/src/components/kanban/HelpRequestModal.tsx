// src/components/kanban/HelpRequestModal.tsx
'use client';

import { useState } from 'react';
import { Task } from '@/types';

interface HelpRequestModalProps {
  task: Task;
  onClose: () => void;
}

export default function HelpRequestModal({ task, onClose }: HelpRequestModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }
      
      console.log('도움 요청 준비:');
      console.log('URL:', `http://localhost:8000/tasks/${task.id}/help-request`);
      console.log('Body:', { message });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
      
      try {
        const response = await fetch(`http://localhost:8000/tasks/${task.id}/help-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('응답 상태:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`서버 오류: ${response.status} ${response.statusText}${errorData.detail ? ` - ${errorData.detail}` : ''}`);
        }
        
        // 응답 데이터 처리
        const data = await response.json().catch(() => ({}));
        console.log('응답 데이터:', data);
        
        // 성공 처리
        alert('도움 요청이 성공적으로 등록되었습니다.');
        window.location.reload();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다. 서버 연결을 확인해주세요.');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error('도움 요청 오류:', error);
      setError(`도움 요청 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-bold mb-4">도움 요청</h3>
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              도움이 필요한 내용
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={4}
              placeholder="어떤 부분에서 도움이 필요한지 설명해 주세요."
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? '요청 중...' : '도움 요청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}