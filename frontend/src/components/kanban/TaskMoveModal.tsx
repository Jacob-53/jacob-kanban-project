// src/components/kanban/TaskMoveModal.tsx
'use client';

import { useState } from 'react';
import { TaskStage, Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';

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
  const [stage, setStage] = useState<TaskStage>(task.stage);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { moveTaskStage } = useTaskStore();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stage === task.stage) {
      onClose();
      return;
    }
    
    setIsSubmitting(true);
    try {
      await moveTaskStage(task.id, { stage, comment });
      onClose();
    } catch (error) {
      console.error('Failed to move task stage:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-bold mb-4">단계 이동</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
              새 단계
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
              placeholder="단계 이동에 대한 코멘트를 입력하세요."
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