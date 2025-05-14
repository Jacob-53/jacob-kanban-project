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
      
      // 수정된 로그인 함수
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          // URL 인코딩된 form-data 사용
          const formData = new URLSearchParams();
          formData.append('username', credentials.username);
          formData.append('password', credentials.password);
          
          // 콘솔에서 성공한 방식과 동일하게 직접 fetch 사용
          const response = await fetch('http://localhost:8000/auth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
          });
          
          if (!response.ok) {
            throw new Error(`로그인 실패: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('로그인 응답:', data);
          
          if (data.access_token) {
            localStorage.setItem('token', data.access_token);
            console.log('토큰 저장됨');
            
            // 사용자 정보 로드
            await get().loadUser();
            
            // 소켓 연결
            socketService.connect();
            
            set({ isLoading: false });
          } else {
            throw new Error('토큰이 응답에 없습니다');
          }
        } catch (error: any) {
          console.error('로그인 오류:', error.message);
          set({
            error: error.message || '로그인 실패하였습니다.',
            isLoading: false
          });
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          console.log('회원가입 요청:', userData);
          await api.post('/users/', userData);
          set({ isLoading: false });
          // 회원가입 성공 후 자동 로그인
          await get().login({
            username: userData.username,
            password: userData.password
          });
        } catch (error: any) {
          console.error('회원가입 오류:', error.response?.data || error.message);
          set({
            error: error.response?.data?.detail || '회원가입 실패하였습니다.',
            isLoading: false
          });
        }
      },
      
      logout: () => {
        console.log('로그아웃 실행');
        localStorage.removeItem('token');
        socketService.disconnect();
        set({ user: null, isAuthenticated: false });
      },
      
      loadUser: async () => {
        const token = localStorage.getItem('token');
        console.log('토큰 확인:', token ? '존재함' : '없음');
        
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        
        set({ isLoading: true });
        try {
          console.log('사용자 정보 요청 시작');
          
          // api 대신 직접 fetch 사용
          const response = await fetch('http://localhost:8000/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`사용자 정보 로드 실패: ${response.status}`);
          }
          
          const userData = await response.json();
          console.log('사용자 정보 응답:', userData);
          
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          console.error('사용자 정보 로드 실패:', error.message);
          localStorage.removeItem('token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);