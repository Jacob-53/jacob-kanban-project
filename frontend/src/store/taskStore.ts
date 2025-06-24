// src/store/taskStore.ts (완전 수정된 버전)
import { create } from 'zustand';
import api from '../lib/api';
import { Task, TaskCreate, TaskUpdate, ID, StageMove } from '../types';
import { webSocketService } from '../lib/websocket'; // ✅ 올바른 WebSocket 서비스

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
  // WebSocket 관련 함수 추가
  setupWebSocketListeners: () => void;
}

// WebSocket 리스너 설정 상태 (중복 방지)
let webSocketListenersSetup = false;

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    
    // WebSocket 리스너 설정 (처음 한 번만)
    if (!webSocketListenersSetup) {
      get().setupWebSocketListeners();
    }
    
    try {
      const response = await api.get<Task[]>('/tasks/');
      set({ tasks: response.data, isLoading: false });
      console.log(`✅ 태스크 ${response.data.length}개 로드 완료`);
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
      
      console.log('✅ 태스크 생성 완료:', response.data.id);
      
      // WebSocket으로 태스크 생성 이벤트 브로드캐스트 (백엔드에서 처리)
      // 여기서는 별도 작업 필요 없음
      
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
      
      console.log('✅ 태스크 업데이트 완료:', response.data.id);
      
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
      
      console.log('✅ 태스크 삭제 완료:', id);
      
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
      console.log('🔄 태스크 단계 이동 시작:', id, stageData);
      
      // 1. 낙관적 업데이트 (즉시 UI 반영)
      const currentTasks = get().tasks;
      const taskIndex = currentTasks.findIndex(task => task.id === id);
      
      if (taskIndex !== -1) {
        const updatedTasks = [...currentTasks];
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          stage: stageData.stage,
          current_stage_started_at: new Date().toISOString()
        };
        
        set({ tasks: updatedTasks });
        console.log('✅ 낙관적 업데이트 완료 - UI 즉시 반영');
      }
      
      // 2. 서버에 실제 요청
      const response = await api.put(`/tasks/${id}/stage`, stageData);
      console.log('✅ 서버 단계 이동 완료:', response.data);
      
      // 3. WebSocket을 통한 실시간 업데이트를 기다림
      // 백엔드에서 다른 클라이언트들에게 브로드캐스트할 것임
      // 만약 WebSocket이 연결되어 있지 않다면 수동으로 업데이트
      setTimeout(() => {
        if (!webSocketService.isConnected()) {
          console.log('🔄 WebSocket 비연결 상태, 수동으로 태스크 새로고침');
          api.get<Task>(`/tasks/${id}`)
            .then(res => get().updateTaskInState(res.data))
            .catch(err => console.warn('태스크 개별 새로고침 실패:', err));
        }
      }, 1000);
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ 태스크 이동 오류:', error);
      
      // 오류 발생 시 전체 태스크 새로고침으로 복구
      get().fetchTasks();
      
      set({ 
        error: error.response?.data?.detail || '태스크 단계 이동에 실패했습니다.'
      });
      throw error;
    }
  },
  
  requestHelp: async (id, message) => {
    try {
      console.log('🆘 도움 요청 시작:', id, message);
      
      const response = await api.post('/help-requests/', { 
        task_id: id,
        message: message || ''
      });
      console.log('✅ 도움 요청 성공:', response.data);
      
      // 태스크 상태 업데이트 (help_needed 플래그)
      const updatedTaskResponse = await api.get<Task>(`/tasks/${id}`);
      get().updateTaskInState(updatedTaskResponse.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ 도움 요청 오류:', error);
      set({ 
        error: error.response?.data?.detail || '도움 요청에 실패했습니다.'
      });
      throw error;
    }
  },
  
  // WebSocket을 통한 태스크 상태 업데이트
  updateTaskInState: (updatedTask) => {
    console.log('🔄 태스크 상태 실시간 업데이트:', updatedTask.id, updatedTask.stage);
    set(state => ({ 
      tasks: state.tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    }));
  },

  // WebSocket 리스너 설정 (한 번만 실행)
  setupWebSocketListeners: () => {
    if (webSocketListenersSetup) {
      console.log('⚠️ WebSocket 리스너 이미 설정됨 (TaskStore)');
      return;
    }
    
    console.log('🎧 TaskStore WebSocket 리스너 설정');
    
    // 태스크 업데이트 이벤트
    webSocketService.addListener('task_update', (taskData: any) => {
      console.log('📨 WebSocket 태스크 업데이트 수신 (TaskStore):', taskData);
      
      if (taskData.task) {
        // 서버에서 전체 태스크 객체를 받은 경우
        get().updateTaskInState(taskData.task);
      } else if (taskData.task_id) {
        // 태스크 ID만 받은 경우, 개별적으로 조회
        api.get<Task>(`/tasks/${taskData.task_id}`)
          .then(res => get().updateTaskInState(res.data))
          .catch(err => console.warn('태스크 개별 조회 실패:', err));
      }
    });

    // 태스크 단계 변경 이벤트
    webSocketService.addListener('task_stage_changed', (taskData: any) => {
      console.log('📨 WebSocket 태스크 단계 변경 수신 (TaskStore):', taskData);
      
      if (taskData.task_id) {
        api.get<Task>(`/tasks/${taskData.task_id}`)
          .then(res => get().updateTaskInState(res.data))
          .catch(err => console.warn('태스크 단계 변경 반영 실패:', err));
      }
    });

    // 태스크 생성 이벤트
    webSocketService.addListener('task_created', (taskData: any) => {
      console.log('📨 WebSocket 태스크 생성 수신 (TaskStore):', taskData);
      // 전체 태스크 목록 새로고침
      get().fetchTasks();
    });

    // 태스크 삭제 이벤트
    webSocketService.addListener('task_deleted', (taskData: any) => {
      console.log('📨 WebSocket 태스크 삭제 수신 (TaskStore):', taskData);
      if (taskData.task_id) {
        const currentTasks = get().tasks;
        set({ tasks: currentTasks.filter(task => task.id !== taskData.task_id) });
      }
    });

    webSocketListenersSetup = true;
    console.log('✅ TaskStore WebSocket 리스너 설정 완료');
  }
}));