// src/app/tasks/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Task } from '@/types';
import TaskMoveModal from '@/components/kanban/TaskMoveModal';
import HelpRequestModal from '@/components/kanban/HelpRequestModal';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('인증이 필요합니다');
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:8000/tasks/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`작업 로드 실패: ${response.status}`);
        }

        const data = await response.json();
        setTasks(data);
      } catch (err: any) {
        setError(err.message || '작업을 불러오는 중 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // 작업 상태별 그룹화
  const groupedTasks: Record<string, Task[]> = {
    todo: [],
    requirements: [],
    design: [],
    implementation: [],
    testing: [],
    review: [],
    done: []
  };

  tasks.forEach(task => {
    if (task.stage in groupedTasks) {
      groupedTasks[task.stage].push(task);
    } else {
      groupedTasks.todo.push(task);
    }
  });

  const stageLabels: Record<string, string> = {
    todo: '할 일',
    requirements: '요구사항 파악',
    design: '설계',
    implementation: '구현',
    testing: '테스트',
    review: '검토',
    done: '완료'
  };

  const openMoveModal = (task: Task) => {
    setSelectedTask(task);
    setIsMoveModalOpen(true);
  };

  const openHelpModal = (task: Task) => {
    setSelectedTask(task);
    setIsHelpModalOpen(true);
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="p-4 bg-white">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">작업 관리</h1>
      
      <div className="overflow-x-auto">
        <div className="flex space-x-4 pb-4">
          {Object.entries(groupedTasks).map(([stage, stageTasks]) => (
            <div key={stage} className="min-w-[280px] bg-gray-50 rounded-lg p-4 shadow">
              <h2 className="font-semibold text-lg mb-3 text-gray-700">
                {stageLabels[stage]} ({stageTasks.length})
              </h2>
              
              <div className="space-y-3">
                {stageTasks.length === 0 ? (
                  <div className="p-3 border border-dashed border-gray-300 rounded-md text-gray-400 text-center text-sm">
                    작업 없음
                  </div>
                ) : (
                  stageTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`bg-white p-3 rounded-md shadow-sm border-l-4 ${
                        task.is_delayed ? 'border-red-500' : 
                        task.help_needed ? 'border-yellow-500' : 'border-indigo-500'
                      }`}
                    >
                      <h3 className="font-medium text-gray-800">{task.title}</h3>
                      {task.description && (
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <div>ID: {task.id}</div>
                        {task.expected_time && (
                          <div>예상 시간: {task.expected_time}분</div>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t flex justify-between">
                        <button
                          onClick={() => openMoveModal(task)}
                          className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                        >
                          단계 이동
                        </button>
                        <button
                          onClick={() => openHelpModal(task)}
                          className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                        >
                          도움 요청
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTask && isMoveModalOpen && (
        <TaskMoveModal 
          task={selectedTask} 
          onClose={() => setIsMoveModalOpen(false)} 
        />
      )}

      {selectedTask && isHelpModalOpen && (
        <HelpRequestModal 
          task={selectedTask} 
          onClose={() => setIsHelpModalOpen(false)} 
        />
      )}
    </div>
  );
}