// src/store/statisticsStore.ts
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { User } from '@/types';

export interface DelayedTask {
  task_id: number;
  title: string;
  user_id: number;
  username: string;
  current_stage: string;
  expected_time: number;
  elapsed_time: number;
  delay_percentage: number;
  started_at: string;
  is_delayed: boolean;
}

export interface TaskTimeStatistics {
  task_id: number;
  title: string;
  stage: string;
  expected_time: number;
  actual_time: number;
  efficiency: number;
}

export interface UserTimeStatistics {
  user_id: number;
  username: string;
  completed_tasks: number;
  total_expected_time: number;
  total_actual_time: number;
  average_efficiency: number;
  stage_statistics: Record<string, TaskTimeStatistics>;
}

export interface ClassStatistics {
  total_students: number;
  total_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  help_requests: number;
  average_progress: number;
  students_progress: Array<{
    user_id: number;
    username: string;
    total_tasks: number;
    completed_tasks: number;
    delayed_tasks: number;
    help_requests: number;
    progress_percentage: number;
  }>;
}

interface StatisticsState {
  delayedTasks: DelayedTask[];
  userStatistics: UserTimeStatistics | null;
  classStatistics: ClassStatistics | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchDelayedTasks: () => Promise<void>;
  checkDelays: (thresholdPercentage?: number) => Promise<void>;
  fetchUserStatistics: (userId: number) => Promise<void>;
  fetchTaskStatistics: (taskId: number) => Promise<TaskTimeStatistics[] | null>;
  fetchClassStatistics: () => Promise<void>;
  clearError: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useStatisticsStore = create<StatisticsState>()((set, get) => ({
  delayedTasks: [],
  userStatistics: null,
  classStatistics: null,
  isLoading: false,
  error: null,

  fetchDelayedTasks: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/time-tracking/delayed-tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('지연된 태스크 목록을 가져올 수 없습니다.');
      }

      const data = await response.json();
      set({ delayedTasks: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  checkDelays: async (thresholdPercentage = 100) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/time-tracking/check-delays`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threshold_percentage: thresholdPercentage }),
      });

      if (!response.ok) {
        throw new Error('지연 체크를 실행할 수 없습니다.');
      }

      const data = await response.json();
      set({ delayedTasks: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  fetchUserStatistics: async (userId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/time-tracking/users/${userId}/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('사용자 통계를 가져올 수 없습니다.');
      }

      const data = await response.json();
      set({ userStatistics: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  fetchTaskStatistics: async (taskId: number): Promise<TaskTimeStatistics[] | null> => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return null;
    }
    
    try {
      const response = await fetch(`${API_URL}/time-tracking/tasks/${taskId}/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('태스크 통계를 가져올 수 없습니다.');
      }

      return await response.json();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '오류가 발생했습니다.' });
      return null;
    }
  },

  fetchClassStatistics: async () => {
    const { token, user } = useAuthStore.getState();
    if (!token || !user) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      // 여러 API를 조합하여 반 통계 생성
      const [tasksResponse, helpRequestsResponse, usersResponse] = await Promise.all([
        fetch(`${API_URL}/tasks/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/help-requests/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/users/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!tasksResponse.ok || !helpRequestsResponse.ok || !usersResponse.ok) {
        throw new Error('통계 데이터를 가져올 수 없습니다.');
      }

      const [tasks, helpRequests, users] = await Promise.all([
        tasksResponse.json(),
        helpRequestsResponse.json(),
        usersResponse.json(),
      ]);

      // 반 학생들만 필터링 (교사인 경우 자신의 반, 관리자인 경우 전체)
      const students = users.filter((u: User) => 
        u.role === 'student' && 
        (user.role === 'admin' || u.class_id === user.class_id)
      );

      const studentsProgress = students.map((student: User) => {
        const studentTasks = tasks.filter((t: any) => t.user_id === student.id);
        const completedTasks = studentTasks.filter((t: any) => t.stage === 'done');
        const delayedTasks = studentTasks.filter((t: any) => t.is_delayed);
        const studentHelpRequests = helpRequests.filter((hr: any) => hr.user_id === student.id);

        return {
          user_id: student.id,
          username: student.username,
          total_tasks: studentTasks.length,
          completed_tasks: completedTasks.length,
          delayed_tasks: delayedTasks.length,
          help_requests: studentHelpRequests.length,
          progress_percentage: studentTasks.length > 0 
            ? Math.round((completedTasks.length / studentTasks.length) * 100)
            : 0,
        };
      });

      const classStats: ClassStatistics = {
        total_students: students.length,
        total_tasks: tasks.length,
        completed_tasks: tasks.filter((t: any) => t.stage === 'done').length,
        delayed_tasks: tasks.filter((t: any) => t.is_delayed).length,
        help_requests: helpRequests.length,
        average_progress: studentsProgress.length > 0
          ? Math.round(studentsProgress.reduce((sum: number, student: any) => sum + student.progress_percentage, 0) / studentsProgress.length)
          : 0,
        students_progress: studentsProgress,
      };

      set({ classStatistics: classStats, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));