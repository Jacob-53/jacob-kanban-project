// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useAuth = (): AuthState => {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    // 초기 로드 시 localStorage에서 토큰 읽기
    const saved = localStorage.getItem('token');
    if (saved) setTokenState(saved);
  }, []);

  const setToken = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setTokenState(newToken);
  };

  const clearToken = () => {
    localStorage.removeItem('token');
    setTokenState(null);
  };

  return { token, setToken, clearToken };
};
