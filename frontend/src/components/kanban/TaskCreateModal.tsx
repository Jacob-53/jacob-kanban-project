// src/components/kanban/TaskCreateModal.tsx
'use client';

import { useState } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { TaskStage } from '@/types';

interface TaskCreateModalProps {
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

export default function TaskCreateModal({ onClose }: TaskCreateModalProps) {
  const { user } = useAuthStore();
  const { createTask } = useTaskStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stage: 'todo' as TaskStage,
    expected_time: 0,
    user_id: 0
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'expected_time' ? parseInt(value) || 0 : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('User is not authenticated');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await createTask({
        ...formData,
        user_id: formData.user_id || user.id
      });
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">새 태스크 생성</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="태스크 제목"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
              placeholder="태스크 설명"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
              초기 단계
            </label>
            <select
              id="stage"
              name="stage"
              value={formData.stage}
              onChange={handleChange}
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
            <label htmlFor="expected_time" className="block text-sm font-medium text-gray-700 mb-1">
              예상 소요 시간 (분)
            </label>
            <input
              id="expected_time"
              name="expected_time"
              type="number"
              min="0"
              value={formData.expected_time}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="예상 소요 시간 (분)"
            />
          </div>
          
          {user?.is_teacher && (
            <div className="mb-4">
              <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-1">
                사용자 ID (비워두면 자신에게 할당)
              </label>
              <input
                id="user_id"
                name="user_id"
                type="number"
                value={formData.user_id || ''}
                onChange={handleChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="할당할 사용자 ID"
              />
            </div>
          )}
          
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
              {isSubmitting ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}