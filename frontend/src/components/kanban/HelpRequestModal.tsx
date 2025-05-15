// src/components/kanban/HelpRequestModal.tsx
'use client';
import { useState } from 'react';
import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';

interface HelpRequestModalProps {
  task: Task;
  onClose: () => void;
}

export default function HelpRequestModal({ task, onClose }: HelpRequestModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestHelp } = useTaskStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await requestHelp(task.id, message);
      onClose();
    } catch (error) {
      console.error('도움 요청 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full shadow-xl">
        <h3 className="text-xl font-bold mb-6 text-gray-800">도움 요청하기</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="message" className="block text-base font-semibold text-gray-800 mb-2">
              어떤 도움이 필요하신가요?
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-800 py-2 px-3 min-h-[120px]"
              placeholder="필요한 도움을 구체적으로 설명해주세요."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-base font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? '요청 중...' : '도움 요청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}