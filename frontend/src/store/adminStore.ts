// src/store/adminStore.ts
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { User } from '@/types';

export interface Class {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  student_count?: number;
}

export interface SystemStats {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_admins: number;
  total_classes: number;
  total_tasks: number;
  completed_tasks: number;
  pending_help_requests: number;
  active_users_today: number;
}

export interface PendingTeacher extends User {
  requested_at: string;
}

interface AdminState {
  // Data
  users: User[];
  classes: Class[];
  pendingTeachers: PendingTeacher[];
  systemStats: SystemStats | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingUsers: boolean;
  isLoadingClasses: boolean;
  isLoadingStats: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  
  // 사용자 관리
  fetchUsers: () => Promise<void>;
  updateUserRole: (userId: number, role: 'admin' | 'teacher' | 'student') => Promise<void>;
  assignUserToClass: (userId: number, classId: number) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
  
  // 반 관리
  fetchClasses: () => Promise<void>;
  createClass: (className: string) => Promise<Class>;
  updateClass: (classId: number, className: string) => Promise<void>;
  deleteClass: (classId: number) => Promise<void>;
  getClassUsers: (classId: number) => Promise<User[]>;
  
  // 교사 승인
  fetchPendingTeachers: () => Promise<void>;
  approveTeacher: (userId: number) => Promise<void>;
  rejectTeacher: (userId: number) => Promise<void>;
  
  // 시스템 통계
  fetchSystemStats: () => Promise<void>;
  
  // Utility
  clearError: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useAdminStore = create<AdminState>()((set, get) => ({
  // Initial state
  users: [],
  classes: [],
  pendingTeachers: [],
  systemStats: null,
  isLoading: false,
  isLoadingUsers: false,
  isLoadingClasses: false,
  isLoadingStats: false,
  error: null,

  // 사용자 관리 Actions
  fetchUsers: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoadingUsers: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('사용자 목록을 가져올 수 없습니다.');
      }

      const users = await response.json();
      set({ users, isLoadingUsers: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoadingUsers: false 
      });
    }
  },

  updateUserRole: async (userId: number, role: 'admin' | 'teacher' | 'student') => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error('사용자 역할을 변경할 수 없습니다.');
      }

      const updatedUser = await response.json();
      set(state => ({
        users: state.users.map(user => 
          user.id === userId ? updatedUser : user
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  assignUserToClass: async (userId: number, classId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/assign-class?class_id=${classId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('사용자를 반에 배정할 수 없습니다.');
      }

      const updatedUser = await response.json();
      set(state => ({
        users: state.users.map(user => 
          user.id === userId ? updatedUser : user
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  deleteUser: async (userId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('사용자를 삭제할 수 없습니다.');
      }

      set(state => ({
        users: state.users.filter(user => user.id !== userId),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  // 반 관리 Actions
  fetchClasses: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoadingClasses: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('반 목록을 가져올 수 없습니다.');
      }

      const classes = await response.json();
      set({ classes, isLoadingClasses: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoadingClasses: false 
      });
    }
  },

  createClass: async (className: string) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      throw new Error('인증이 필요합니다.');
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/classes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: className }),
      });

      if (!response.ok) {
        throw new Error('반을 생성할 수 없습니다.');
      }

      const newClass = await response.json();
      set(state => ({
        classes: [...state.classes, newClass],
        isLoading: false
      }));
      
      return newClass;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
      throw error;
    }
  },

  updateClass: async (classId: number, className: string) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: className }),
      });

      if (!response.ok) {
        throw new Error('반 정보를 수정할 수 없습니다.');
      }

      const updatedClass = await response.json();
      set(state => ({
        classes: state.classes.map(cls => 
          cls.id === classId ? updatedClass : cls
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  deleteClass: async (classId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('반을 삭제할 수 없습니다.');
      }

      set(state => ({
        classes: state.classes.filter(cls => cls.id !== classId),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  getClassUsers: async (classId: number): Promise<User[]> => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return [];
    }
    
    try {
      const response = await fetch(`${API_URL}/classes/${classId}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('반 학생 목록을 가져올 수 없습니다.');
      }

      return await response.json();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '오류가 발생했습니다.' });
      return [];
    }
  },

  // 교사 승인 Actions
  fetchPendingTeachers: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/teachers/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('대기 중인 교사 목록을 가져올 수 없습니다.');
      }

      const pendingTeachers = await response.json();
      set({ pendingTeachers, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  approveTeacher: async (userId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/teachers/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('교사를 승인할 수 없습니다.');
      }

      set(state => ({
        pendingTeachers: state.pendingTeachers.filter(teacher => teacher.id !== userId),
        isLoading: false
      }));
      
      // 사용자 목록도 업데이트
      get().fetchUsers();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  rejectTeacher: async (userId: number) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/teachers/${userId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('교사 승인을 거부할 수 없습니다.');
      }

      set(state => ({
        pendingTeachers: state.pendingTeachers.filter(teacher => teacher.id !== userId),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  // 시스템 통계 Actions
  fetchSystemStats: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoadingStats: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/admin/stats/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('시스템 통계를 가져올 수 없습니다.');
      }

      const systemStats = await response.json();
      set({ systemStats, isLoadingStats: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoadingStats: false 
      });
    }
  },

  // Utility
  clearError: () => {
    set({ error: null });
  },
}));