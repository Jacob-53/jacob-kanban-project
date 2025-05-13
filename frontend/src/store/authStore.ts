// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import { User, UserLoginRequest, UserRegisterRequest, AuthResponse } from '../types';
import { socketService } from '../lib/socket';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: UserLoginRequest) => Promise<void>;
  register: (userData: UserRegisterRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          // URL 인코딩된 폼 데이터로 변환
          const formData = new URLSearchParams();
          formData.append('username', credentials.username);
          formData.append('password', credentials.password);
          
          const response = await api.post<AuthResponse>('/auth/token', formData.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          
          localStorage.setItem('token', response.data.access_token);
          
          // 사용자 정보 로드
          await get().loadUser();
          
          // 웹소켓 연결
          socketService.connect();
        } catch (error: any) {
          set({ 
            error: error.response?.data?.detail || '로그인에 실패했습니다.', 
            isLoading: false 
          });
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/users/', userData);
          set({ isLoading: false });
          
          // 자동 로그인 (선택)
          await get().login({
            username: userData.username,
            password: userData.password
          });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.detail || '회원가입에 실패했습니다.', 
            isLoading: false 
          });
        }
      },
      
      logout: () => {
        localStorage.removeItem('token');
        socketService.disconnect();
        set({ user: null, isAuthenticated: false });
      },
      
      loadUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        
        set({ isLoading: true });
        try {
          const response = await api.get<User>('/users/me');
          set({ 
            user: response.data, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          localStorage.removeItem('token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage', // 로컬 스토리지 키 이름
      partialize: (state) => ({ 
        // 민감하지 않은 정보만 저장
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);