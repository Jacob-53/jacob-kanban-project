// src/components/kanban/KanbanBoard.tsx (완전 수정된 버전)
'use client';

import { useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { webSocketService as socketService } from '@/lib/websocket'; // ✅ 올바른 WebSocket 서비스
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
    console.log('🏁 KanbanBoard 마운트됨');
    
    // 태스크 로드
    fetchTasks();
    
    // ✅ WebSocket은 authStore에서 관리하므로 여기서는 제거
    // 태스크 업데이트 이벤트 리스너만 등록
    const handleTaskUpdate = async (eventData: any) => {
      console.log('📨 칸반보드에서 태스크 업데이트 수신:', eventData);
      
      if (eventData.task_id) {
        try {
          // 백엔드 API로 최신 태스크 정보 조회
          const token = localStorage.getItem('token');
          if (!token) {
            console.warn('⚠️ 토큰이 없어서 태스크 업데이트를 처리할 수 없습니다');
            return;
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/tasks/${eventData.task_id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const updatedTask = await response.json();
            updateTaskInState(updatedTask);
            console.log('✅ 태스크 상태 업데이트 완료:', updatedTask.id, updatedTask.stage);
          } else {
            console.warn('⚠️ 태스크 조회 응답 오류:', response.status);
          }
        } catch (error) {
          console.error('❌ 태스크 업데이트 실패:', error);
        }
      } else if (eventData.task) {
        // 이미 전체 태스크 객체를 받은 경우
        updateTaskInState(eventData.task);
        console.log('✅ 태스크 객체 직접 업데이트:', eventData.task.id, eventData.task.stage);
      }
    };

    // 다양한 태스크 관련 이벤트 리스너 등록
    socketService.addListener('task_update', handleTaskUpdate);
    socketService.addListener('task_stage_changed', handleTaskUpdate);
    socketService.addListener('task_created', handleTaskUpdate);
    socketService.addListener('help_request', handleTaskUpdate);
    socketService.addListener('delay_detected', handleTaskUpdate);
    
    console.log('✅ KanbanBoard WebSocket 리스너 등록 완료');
    
    // 클린업 함수
    return () => {
      console.log('🧹 KanbanBoard 언마운트 - 리스너 제거');
      socketService.removeListener('task_update', handleTaskUpdate);
      socketService.removeListener('task_stage_changed', handleTaskUpdate);
      socketService.removeListener('task_created', handleTaskUpdate);
      socketService.removeListener('help_request', handleTaskUpdate);
      socketService.removeListener('delay_detected', handleTaskUpdate);
    };
  }, [fetchTasks, updateTaskInState]);
  
  if (isLoading) {
    return (
      <div className="h-64 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-gray-600">태스크를 불러오는 중...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>오류:</strong> {error}
        <button 
          onClick={fetchTasks}
          className="ml-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">칸반 보드</h1>
          <p className="text-gray-600 text-sm mt-1">
            총 {tasks.length}개 태스크 • 
            완료: {tasks.filter(t => t.stage === 'done').length}개 • 
            진행중: {tasks.filter(t => t.stage !== 'done' && t.stage !== 'todo').length}개
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
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