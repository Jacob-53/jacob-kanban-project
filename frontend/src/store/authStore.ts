// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserLoginRequest, UserRegisterRequest } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  login: (credentials: UserLoginRequest) => Promise<void>;
  register: (userData: UserRegisterRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      setError: (error) => set({ error }),

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const formData = new URLSearchParams();
          formData.append('username', credentials.username);
          formData.append('password', credentials.password);

          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const response = await fetch(`${API_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
          });

          if (!response.ok) {
            let errorMessage = `Login failed: ${response.status}`;
            try {
              const errorData = await response.json();
              if (errorData?.detail) errorMessage = errorData.detail;
            } catch {}
            throw new Error(errorMessage);
          }

          const data = await response.json();
          const token = data.access_token;
          if (!token) throw new Error('No token received from server');

          localStorage.setItem('token', token);
          set({ token });
document.cookie = `token=${token}; path=/;`; // ✅ store token in cookie for middleware
          await get().loadUser();
        } catch (error: any) {
          console.error('Login error:', error);
          localStorage.removeItem('token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: error.message || 'Login failed',
            isLoading: false
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const response = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
          });
          if (!response.ok) throw new Error('Registration failed');

          set({ isLoading: false });
          await get().login({ username: userData.username, password: userData.password });
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      loadUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ user: null, token: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          console.log("🔍 Sending token:", token);
          const response = await fetch(`${API_URL}/users/me`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
          });

          console.log("🔍 loadUser response status:", response.status);
          const text = await response.text();
          console.log("🔍 loadUser response body:", text);

          if (!response.ok) throw new Error(`Failed to fetch user info: ${response.status}`);

          const userData = JSON.parse(text);
          set({
            user: userData,
            token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          console.error('User fetch error:', error);
          set({
            error: 'Failed to fetch user info',
            isAuthenticated: false,
            isLoading: false
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
