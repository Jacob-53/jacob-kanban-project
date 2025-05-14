// src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use((config) => {
  // 브라우저 환경에서만 실행
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('요청에 인증 토큰 추가:', config.url);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log('인증 토큰 없음, 인증 헤더 없이 요청:', config.url);
    }
  }
  return config;
}, (error) => {
  console.error('API 요청 인터셉터 오류:', error);
  return Promise.reject(error);
});

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    console.log('API 응답 성공:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API 응답 오류:', 
      error.config?.url, 
      error.response?.status, 
      error.response?.data || error.message
    );
    
    // 401 Unauthorized: 토큰이 만료되었거나 유효하지 않음
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      console.log('인증 실패, 로그아웃 처리');
      localStorage.removeItem('token');
      
      // 현재 경로가 이미 로그인 페이지가 아닌 경우에만 리다이렉트
      if (!window.location.pathname.includes('/auth/login')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;