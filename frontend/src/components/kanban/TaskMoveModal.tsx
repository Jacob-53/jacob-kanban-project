// src/components/kanban/TaskMoveModal.tsx
'use client';

import { useState } from 'react';
import { TaskStage, Task } from '@/types';

interface TaskMoveModalProps {
  task: Task;
  onClose: () => void;
}

const stageLabels: Record<TaskStage, string> = {
  todo: '할 일',
  requirements: '요구사항 파악',
  design: '설계',
  implementation: '구현',
  testing: '테스트',
  review: '검토',
  done: '완료'
};

export default function TaskMoveModal({ task, onClose }: TaskMoveModalProps) {
  const [stage, setStage] = useState<TaskStage>(task.stage as TaskStage);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (stage === task.stage) {
      onClose();
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }
      
      console.log('단계 이동 요청 준비:');
      console.log('URL:', `http://localhost:8000/tasks/${task.id}/stage`);
      console.log('Headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.substring(0, 10)}...` // 토큰 일부만 표시
      });
      console.log('Body:', { stage, comment });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
      
      try {
        const response = await fetch(`http://localhost:8000/tasks/${task.id}/stage`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ stage, comment }),
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
        alert(`단계가 [${stageLabels[stage]}](으)로 변경되었습니다.`);
        window.location.reload();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다. 서버 연결을 확인해주세요.');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error('단계 이동 오류:', error);
      setError(`단계 이동 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-bold mb-4">작업 단계 이동</h3>
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
              단계
            </label>
            <select
              id="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as TaskStage)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              코멘트 (선택사항)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
              placeholder="단계 이동에 대한 설명을 입력하세요."
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
              className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? '이동 중...' : '이동'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}