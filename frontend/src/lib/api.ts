// src/lib/api.ts
import axios from 'axios';

// API 기본 URL 설정 (환경 변수 또는 기본값)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 모든 요청에 Authorization 헤더 추가
api.interceptors.request.use((config) => {
  // 서버 사이드 렌더링에서는 localStorage에 접근할 수 없음
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 응답 인터셉터: 인증 오류 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized 오류 처리
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      console.log('인증 오류 발생: 토큰이 만료되었거나 유효하지 않습니다.');
      
      // 로컬 스토리지에서 토큰 제거
      localStorage.removeItem('token');
      
      // 로그인 페이지로 리디렉션
      window.location.href = '/auth/login';
    }
    
    // 다른 오류는 그대로 전달
    return Promise.reject(error);
  }
);

export default api;