// src/store/taskStore.ts
import { create } from 'zustand';
import api from '../lib/api';
import { Task, TaskCreate, TaskUpdate, ID, StageMove } from '../types';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  getTaskById: (id: ID) => Task | undefined;
  createTask: (taskData: TaskCreate) => Promise<Task>;
  updateTask: (id: ID, taskData: TaskUpdate) => Promise<Task>;
  deleteTask: (id: ID) => Promise<void>;
  moveTaskStage: (id: ID, stageData: StageMove) => Promise<any>;
  requestHelp: (id: ID, message?: string) => Promise<any>;
  updateTaskInState: (updatedTask: Task) => void;
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Task[]>('/tasks/');
      set({ tasks: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || '태스크를 불러오는데 실패했습니다.', 
        isLoading: false 
      });
    }
  },
  
  getTaskById: (id) => {
    return get().tasks.find(task => task.id === id);
  },
  
  createTask: async (taskData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<Task>('/tasks/', taskData);
      set(state => ({ 
        tasks: [...state.tasks, response.data], 
        isLoading: false 
      }));
      return response.data;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || '태스크 생성에 실패했습니다.', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateTask: async (id, taskData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put<Task>(`/tasks/${id}`, taskData);
      set(state => ({ 
        tasks: state.tasks.map(task => task.id === id ? response.data : task), 
        isLoading: false 
      }));
      return response.data;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || '태스크 업데이트에 실패했습니다.', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/tasks/${id}`);
      set(state => ({ 
        tasks: state.tasks.filter(task => task.id !== id), 
        isLoading: false 
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || '태스크 삭제에 실패했습니다.', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  moveTaskStage: async (id, stageData) => {
    try {
      const response = await api.put(`/tasks/${id}/stage`, stageData);
      // 서버에서 최신 태스크 정보 다시 가져오기
      const updatedTaskResponse = await api.get<Task>(`/tasks/${id}`);
      const updatedTask = updatedTaskResponse.data;
      
      // 상태 업데이트
      set(state => ({ 
        tasks: state.tasks.map(task => task.id === id ? updatedTask : task)
      }));
      
      return response.data;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || '태스크 단계 이동에 실패했습니다.'
      });
      throw error;
    }
  },
  
  requestHelp: async (id, message) => {
    try {
      const response = await api.post(`/tasks/${id}/help-request`, { message });
      // 서버에서 최신 태스크 정보 다시 가져오기
      const updatedTaskResponse = await api.get<Task>(`/tasks/${id}`);
      const updatedTask = updatedTaskResponse.data;
      
      // 상태 업데이트
      set(state => ({ 
        tasks: state.tasks.map(task => task.id === id ? updatedTask : task)
      }));
      
      return response.data;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || '도움 요청에 실패했습니다.'
      });
      throw error;
    }
  },
  
  // 웹소켓 이벤트를 통해 태스크 업데이트
  updateTaskInState: (updatedTask) => {
    set(state => ({ 
      tasks: state.tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    }));
  }
}));