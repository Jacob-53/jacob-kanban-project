// src/components/kanban/TaskCard.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Task } from '@/types';
import TaskMoveModal from './TaskMoveModal';
import HelpRequestModal from './HelpRequestModal';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const router = useRouter();
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko });
  };
  
  return (
    <div className={`
      bg-white rounded-lg shadow p-4 
      ${task.is_delayed ? 'border-l-4 border-red-500' : ''} 
      ${task.help_needed ? 'border-l-4 border-yellow-500' : ''}
    `}>
      <h4 
        className="font-bold text-lg cursor-pointer hover:text-indigo-600"
        onClick={() => router.push(`/tasks/${task.id}`)}
      >
        {task.title}
      </h4>
      
      {task.description && (
        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
        {task.current_stage_started_at && (
          <span>시작: {formatDate(task.current_stage_started_at)}</span>
        )}
        {task.expected_time && (
          <span>예상 시간: {task.expected_time}분</span>
        )}
      </div>
      
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => setIsMoveModalOpen(true)}
          className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
        >
          단계 이동
        </button>
        
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="text-sm px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
        >
          도움 요청
        </button>
      </div>
      
      {task.is_delayed && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
          <span className="font-bold">지연 중</span>: 예상시간 초과
        </div>
      )}
      
      {task.help_needed && (
        <div className="mt-3 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
          <span className="font-bold">도움 요청 중</span>
          {task.help_message && `: ${task.help_message}`}
        </div>
      )}
      
      {isMoveModalOpen && (
        <TaskMoveModal 
          task={task} 
          onClose={() => setIsMoveModalOpen(false)} 
        />
      )}
      
      {isHelpModalOpen && (
        <HelpRequestModal 
          task={task} 
          onClose={() => setIsHelpModalOpen(false)} 
        />
      )}
    </div>
  );
}