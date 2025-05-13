// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { tasks, fetchTasks } = useTaskStore();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    delayedTasks: 0,
    helpRequests: 0
  });
  
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  useEffect(() => {
    if (tasks.length) {
      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.stage === 'done').length,
        delayedTasks: tasks.filter(t => t.is_delayed).length,
        helpRequests: tasks.filter(t => t.help_needed).length
      });
    }
  }, [tasks]);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">안녕하세요, {user?.username}님!</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="총 태스크" 
          value={stats.totalTasks} 
          bgColor="bg-blue-500" 
          href="/tasks" 
        />
        <StatCard 
          title="완료된 태스크" 
          value={stats.completedTasks} 
          bgColor="bg-green-500" 
          href="/tasks?stage=done" 
        />
        <StatCard 
          title="지연된 태스크" 
          value={stats.delayedTasks} 
          bgColor="bg-red-500" 
          href="/tasks?filter=delayed" 
        />
        <StatCard 
          title="도움 요청" 
          value={stats.helpRequests} 
          bgColor="bg-yellow-500" 
          href="/help-requests" 
        />
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">최근 작업</h2>
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.slice(0, 5).map(task => (
              <Link 
                key={task.id}
                href={`/tasks/${task.id}`}
                className="block p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-gray-500">단계: {task.stage}</p>
                  </div>
                  <div>
                    {task.is_delayed && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">지연</span>
                    )}
                    {task.help_needed && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded ml-2">도움 필요</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">최근 작업이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  bgColor: string;
  href: string;
}

function StatCard({ title, value, bgColor, href }: StatCardProps) {
  return (
    <Link href={href} className={`${bgColor} text-white rounded-lg shadow p-6 hover:opacity-90 transition-opacity`}>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </Link>
  );
}