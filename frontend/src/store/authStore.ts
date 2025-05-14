// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserLoginRequest, UserRegisterRequest } from '../types';

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
          // URL 인코딩된 form-data 사용
          const formData = new URLSearchParams();
          formData.append('username', credentials.username);
          formData.append('password', credentials.password);
          
          // 직접 fetch 사용
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
            
            // 토큰에서 사용자명 추출
            const parts = data.access_token.split('.');
            if (parts.length === 3) {
              try {
                const payload = JSON.parse(atob(parts[1]));
                console.log('토큰 페이로드:', payload);
                
                // 사용자명으로 정보 가져오기
                if (payload.sub) {
                  const userResponse = await fetch(`http://localhost:8000/users/${payload.sub}`, {
                    headers: {
                      'Authorization': `Bearer ${data.access_token}`
                    }
                  });
                  
                  if (userResponse.ok) {
                    const userData = await userResponse.json();
                    console.log('사용자 정보:', userData);
                    
                    // 상태 업데이트 중요!
                    set({
                      user: userData,
                      isAuthenticated: true,
                      isLoading: false
                    });
                    
                    return; // 성공적으로 처리됨
                  }
                }
              } catch (e) {
                console.error('토큰 디코딩 오류:', e);
              }
            }
            
            // 위 시도가 실패하면, 사용자 정보 없이 인증 상태만 설정
            set({
              // 최소한의 사용자 객체
              user: {
                id: 0,
                username: credentials.username,
                is_teacher: false,
                tasks: []
              },
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            throw new Error('응답에 토큰이 없습니다');
          }
        } catch (error: any) {
          console.error('로그인 오류:', error);
          set({
            error: error.message || '로그인 실패하였습니다.',
            isLoading: false
          });
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:8000/users/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
          });
          
          if (!response.ok) {
            throw new Error(`회원가입 실패: ${response.status}`);
          }
          
          set({ isLoading: false });
          
          // 회원가입 성공 후 자동 로그인
          await get().login({
            username: userData.username,
            password: userData.password
          });
        } catch (error: any) {
          console.error('회원가입 오류:', error);
          set({
            error: error.message || '회원가입 실패하였습니다.',
            isLoading: false
          });
        }
      },
      
      logout: () => {
        localStorage.removeItem('token');
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
          // 토큰에서 사용자명 추출
          const parts = token.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]));
              
              // 사용자명으로 정보 가져오기
              if (payload.sub) {
                const response = await fetch(`http://localhost:8000/users/${payload.sub}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (response.ok) {
                  const userData = await response.json();
                  
                  set({
                    user: userData,
                    isAuthenticated: true,
                    isLoading: false
                  });
                  
                  return; // 성공적으로 처리됨
                }
              }
            } catch (e) {
              console.error('토큰 디코딩 오류:', e);
            }
          }
          
          // 토큰이 있지만 사용자 정보를 가져오지 못한 경우, 인증 상태만 설정
          set({
            user: {
              id: 0, 
              username: 'Unknown',
              is_teacher: false,
              tasks: []
            },
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          console.error('사용자 정보 로드 실패:', error);
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