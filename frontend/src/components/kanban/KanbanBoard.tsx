// src/components/kanban/KanbanBoard.tsx
'use client';

import { useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { socketService } from '@/lib/socket';
import { TaskStage } from '@/types';
import TaskColumn from './TaskColumn';
import TaskCreateModal from './TaskCreateModal';
import { useState } from 'react';

const stageLabels: Record<TaskStage, string> = {
  todo: '할 일',
  requirements: '요구사항 파악',
  design: '설계',
  implementation: '구현',
  testing: '테스트',
  review: '검토',
  done: '완료'
};

const stageList: TaskStage[] = ['todo', 'requirements', 'design', 'implementation', 'testing', 'review', 'done'];

export default function KanbanBoard() {
  const { tasks, fetchTasks, isLoading, error, updateTaskInState } = useTaskStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  useEffect(() => {
    // 태스크 로드
    fetchTasks();
    
    // 웹소켓 연결 및 이벤트 리스너 설정
    socketService.connect();
    
    // 태스크 업데이트 이벤트 리스너
    const handleTaskUpdate = async (eventData: any) => {
      if (eventData.task_id) {
        try {
          // 태스크 정보 다시 가져오기
          const response = await fetch(`/api/tasks/${eventData.task_id}`);
          const updatedTask = await response.json();
          updateTaskInState(updatedTask);
        } catch (error) {
          console.error('Failed to fetch updated task:', error);
        }
      }
    };
    
    socketService.addListener('task_update', handleTaskUpdate);
    socketService.addListener('help_request', handleTaskUpdate);
    socketService.addListener('delay_detected', handleTaskUpdate);
    
    // 클린업
    return () => {
      socketService.removeListener('task_update', handleTaskUpdate);
      socketService.removeListener('help_request', handleTaskUpdate);
      socketService.removeListener('delay_detected', handleTaskUpdate);
    };
  }, [fetchTasks, updateTaskInState]);
  
  if (isLoading) {
    return (
      <div className="h-64 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">칸반 보드</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + 태스크 생성
        </button>
      </div>
      
      <div className="flex space-x-4 overflow-x-auto pb-6">
        {stageList.map(stage => (
          <TaskColumn
            key={stage}
            stage={stage}
            title={stageLabels[stage]}
            tasks={tasks.filter(task => task.stage === stage)}
          />
        ))}
      </div>
      
      {isCreateModalOpen && (
        <TaskCreateModal
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}