// src/store/helpRequestStore.ts
import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface HelpRequest {
  id: number;
  task_id: number;
  user_id: number;
  username: string;
  task_title: string;
  message?: string;
  requested_at: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: number;
  resolver_name?: string;
  resolution_message?: string;
}

export interface CreateHelpRequestPayload {
  task_id: number;
  message?: string;
}

export interface ResolveHelpRequestPayload {
  resolution_message?: string;
}

interface HelpRequestState {
  helpRequests: HelpRequest[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchHelpRequests: () => Promise<void>;
  getHelpRequest: (id: number) => Promise<HelpRequest | null>;
  createHelpRequest: (payload: CreateHelpRequestPayload) => Promise<HelpRequest | null>;
  resolveHelpRequest: (id: number, payload: ResolveHelpRequestPayload) => Promise<HelpRequest | null>;
  clearError: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useHelpRequestStore = create<HelpRequestState>()((set, get) => ({
  helpRequests: [],
  isLoading: false,
  error: null,

  fetchHelpRequests: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/help-requests/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('도움 요청 목록을 가져올 수 없습니다.');
      }

      const data = await response.json();
      set({ helpRequests: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
    }
  },

  getHelpRequest: async (id: number): Promise<HelpRequest | null> => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return null;
    }
    
    try {
      const response = await fetch(`${API_URL}/help-requests/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('도움 요청을 가져올 수 없습니다.');
      }

      return await response.json();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '오류가 발생했습니다.' });
      return null;
    }
  },

  createHelpRequest: async (payload: CreateHelpRequestPayload): Promise<HelpRequest | null> => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/help-requests/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('도움 요청을 생성할 수 없습니다.');
      }

      const newHelpRequest = await response.json();
      set(state => ({ 
        helpRequests: [newHelpRequest, ...state.helpRequests],
        isLoading: false 
      }));
      return newHelpRequest;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
      return null;
    }
  },

  resolveHelpRequest: async (id: number, payload: ResolveHelpRequestPayload): Promise<HelpRequest | null> => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ error: '인증이 필요합니다.' });
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/help-requests/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('도움 요청을 해결할 수 없습니다.');
      }

      const resolvedHelpRequest = await response.json();
      set(state => ({ 
        helpRequests: state.helpRequests.map(hr => 
          hr.id === id ? resolvedHelpRequest : hr
        ),
        isLoading: false 
      }));
      return resolvedHelpRequest;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '오류가 발생했습니다.',
        isLoading: false 
      });
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));