// src/store/authStore.ts (완전 수정된 버전)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserLoginRequest, UserRegisterRequest } from '@/types';
import { webSocketService } from '@/lib/websocket'; // WebSocket 서비스 추가

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // WebSocket 관련 상태 추가
  isWebSocketConnected: boolean;
  setError: (error: string | null) => void;
  clearError: () => void;
  login: (credentials: UserLoginRequest) => Promise<void>;
  register: (userData: UserRegisterRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  initializeAuth: () => void;
  // WebSocket 관련 함수 추가
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// WebSocket 리스너 중복 등록 방지
let webSocketListenersSetup = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isWebSocketConnected: false, // WebSocket 상태 추가

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // 초기화 함수 - localStorage와 store 동기화
      initializeAuth: () => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          set({ token: storedToken });
        }
      },

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log("🔐 로그인 시도:", credentials.username);
          
          const formData = new URLSearchParams();
          formData.append('username', credentials.username);
          formData.append('password', credentials.password);

          const response = await fetch(`${API_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
          });

          console.log("📡 로그인 응답:", response.status);

          if (!response.ok) {
            let errorMessage = `로그인 실패: ${response.status}`;
            try {
              const errorData = await response.json();
              if (errorData?.detail) errorMessage = errorData.detail;
            } catch {}
            throw new Error(errorMessage);
          }

          const data = await response.json();
          const token = data.access_token;
          
          if (!token) {
            throw new Error('서버에서 토큰을 받지 못했습니다');
          }

          console.log("✅ 토큰 발급 성공");

          // 토큰을 localStorage와 store에 저장
          localStorage.setItem('token', token);
          document.cookie = `token=${token}; path=/;`;
          set({ token });

          // 사용자 정보 로드
          await get().loadUser();
          
          // WebSocket 연결 시도 (로그인 성공 후)
          try {
            await get().connectWebSocket();
          } catch (wsError) {
            console.warn("⚠️ WebSocket 연결 실패 (무시하고 계속):", wsError);
            // WebSocket 연결 실패해도 로그인 자체는 성공으로 처리
          }
          
        } catch (error: any) {
          console.error('❌ 로그인 오류:', error);
          
          // 오류 발생시 토큰 정리
          localStorage.removeItem('token');
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: error.message || '로그인에 실패했습니다',
            isLoading: false
          });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log("📝 회원가입 시도:", userData.username);
          
          const response = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
          });
          
          if (!response.ok) {
            let errorMessage = '회원가입에 실패했습니다';
            try {
              const errorData = await response.json();
              if (errorData?.detail) errorMessage = errorData.detail;
            } catch {}
            throw new Error(errorMessage);
          }

          console.log("✅ 회원가입 성공, 로그인 진행");
          
          // 회원가입 성공 후 자동 로그인
          await get().login({ 
            username: userData.username, 
            password: userData.password 
          });
          
        } catch (error: any) {
          console.error('❌ 회원가입 오류:', error);
          set({
            error: error.message || '회원가입에 실패했습니다',
            isLoading: false
          });
          throw error;
        }
      },

      logout: () => {
        console.log("🚪 로그아웃");
        
        // WebSocket 연결 해제
        get().disconnectWebSocket();
        
        // 모든 저장된 토큰 정리
        localStorage.removeItem('token');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        // WebSocket 리스너 설정 플래그 리셋
        webSocketListenersSetup = false;
        
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          isWebSocketConnected: false,
          error: null 
        });
      },

      loadUser: async () => {
        const { token } = get();
        const storedToken = localStorage.getItem('token');
        const finalToken = token || storedToken;
        
        if (!finalToken) {
          console.log("🔍 토큰 없음, 사용자 정보 로드 건너뛰기");
          set({ 
            user: null, 
            token: null,
            isAuthenticated: false, 
            isLoading: false 
          });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          console.log("🔍 사용자 정보 로드 시도");
          console.log("🔑 토큰 확인:", !!finalToken);

          const response = await fetch(`${API_URL}/users/me`, {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${finalToken}`,
              'Content-Type': 'application/json'
            }
          });

          console.log("📡 사용자 정보 응답:", response.status);

          if (!response.ok) {
            if (response.status === 401) {
              console.log("🔒 토큰 만료 또는 무효, 로그아웃 처리");
              get().logout();
              return;
            }
            
            let errorMessage = '사용자 정보를 불러올 수 없습니다';
            try {
              const errorData = await response.json();
              if (errorData?.detail) errorMessage = errorData.detail;
            } catch {}
            throw new Error(errorMessage);
          }

          const responseText = await response.text();
          console.log("📄 응답 내용:", responseText);

          const userData = JSON.parse(responseText);
          console.log("✅ 사용자 정보 로드 성공:", userData.username, userData.role);

          // localStorage와 store 동기화
          if (storedToken && !token) {
            set({ token: storedToken });
          }

          set({
            user: userData,
            token: finalToken,
            isAuthenticated: true,
            isLoading: false
          });

        } catch (error: any) {
          console.error('❌ 사용자 정보 로드 오류:', error);
          
          // 네트워크 오류와 인증 오류 구분
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            set({
              error: '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.',
              isLoading: false
            });
          } else {
            // 인증 관련 오류는 로그아웃 처리
            get().logout();
          }
        }
      },

      // === WebSocket 관련 기능 추가 ===
      connectWebSocket: async () => {
        const token = get().token || localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ 토큰이 없어서 WebSocket 연결을 할 수 없습니다');
          return;
        }

        if (webSocketService.isConnected()) {
          console.log('✅ WebSocket이 이미 연결되어 있습니다');
          set({ isWebSocketConnected: true });
          return;
        }

        try {
          console.log('🔌 WebSocket 연결 시작...');
          
          // WebSocket 이벤트 리스너 등록 (한 번만)
          if (!webSocketListenersSetup) {
            webSocketService.addListener('connected', (data: any) => {
              console.log('✅ WebSocket 물리적 연결 완료');
              set({ isWebSocketConnected: true });
            });

            webSocketService.addListener('authenticated', (data: any) => {
              console.log('🎉 WebSocket 인증 성공!', data);
              set({ isWebSocketConnected: true });
            });

            webSocketService.addListener('connection_failed', (data: any) => {
              console.log('❌ WebSocket 연결 실패', data);
              set({ isWebSocketConnected: false });
            });

            webSocketService.addListener('disconnected', (data: any) => {
              console.log('🔌 WebSocket 연결 해제됨', data);
              set({ isWebSocketConnected: false });
            });

            webSocketListenersSetup = true;
            console.log('✅ WebSocket 리스너 설정 완료');
          }

          // ✅ 파라미터 없이 호출 (내부에서 토큰 추출)
          webSocketService.connect();
          
          // 주기적으로 핑 전송 (연결 유지)
          const pingInterval = setInterval(() => {
            if (webSocketService.isConnected()) {
              webSocketService.ping();
            } else {
              clearInterval(pingInterval); // 연결 끊어지면 인터벌 정리
            }
          }, 30000); // 30초마다

        } catch (error) {
          console.error('❌ WebSocket 연결 실패:', error);
          set({ isWebSocketConnected: false });
          // WebSocket 연결 실패는 치명적이지 않으므로 throw하지 않음
        }
      },

      disconnectWebSocket: () => {
        console.log('🔌 WebSocket 연결 해제');
        webSocketService.disconnect();
        set({ isWebSocketConnected: false });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
        // WebSocket 상태는 persist하지 않음 (세션마다 새로 연결)
      })
    }
  )
);