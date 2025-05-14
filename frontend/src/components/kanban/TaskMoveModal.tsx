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
      <div className="bg-white rounded-lg p-6 w-96 max-w-full shadow-xl">
        <h3 className="text-xl font-bold mb-6 text-gray-800">작업 단계 이동</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="stage" className="block text-base font-semibold text-gray-800 mb-2">
              단계
            </label>
            <select
              id="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as TaskStage)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-800 py-2 px-3 bg-white"
            >
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value} className="text-gray-800">
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-6">
            <label htmlFor="comment" className="block text-base font-semibold text-gray-800 mb-2">
              코멘트 (선택사항)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-800 py-2 px-3 min-h-[100px]"
              placeholder="단계 이동에 대한 설명을 입력하세요."
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
              className={`px-5 py-2 text-base font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? '이동 중...' : '이동'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}