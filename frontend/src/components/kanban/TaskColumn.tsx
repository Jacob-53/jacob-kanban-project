// src/components/kanban/TaskColumn.tsx
'use client';

import { Task, TaskStage } from '@/types';
import TaskCard from './TaskCard';

interface TaskColumnProps {
  stage: TaskStage;
  title: string;
  tasks: Task[];
}

export default function TaskColumn({ stage, title, tasks }: TaskColumnProps) {
  return (
    <div className="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">{title}</h3>
        <span className="bg-gray-200 text-gray-700 py-1 px-2 rounded text-sm">
          {tasks.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-300 rounded-md text-gray-500 text-center">
            태스크 없음
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}