// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { TaskUpdateEvent } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect() {
    // 서버 사이드 렌더링에서는 작동하지 않도록
    if (typeof window === 'undefined') return;
    
    // 토큰이 없으면 연결하지 않음
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // 소켓 연결 정보
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';
    
    // 소켓 연결
    this.socket = io(SOCKET_URL, {
      auth: {
        token
      }
    });
    
    // 연결 이벤트 리스너
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });
    
    // 연결 해제 이벤트 리스너
    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    // 연결 오류 처리
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    // 리스너 설정
    this.setupListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupListeners() {
    if (!this.socket) return;
    
    // 태스크 업데이트 이벤트 리스너
    this.socket.on('task_update', (data: TaskUpdateEvent) => {
      this.notifyListeners('task_update', data);
    });
    
    // 도움 요청 이벤트 리스너
    this.socket.on('help_request', (data: any) => {
      this.notifyListeners('help_request', data);
    });
    
    // 지연 감지 이벤트 리스너
    this.socket.on('delay_detected', (data: any) => {
      this.notifyListeners('delay_detected', data);
    });
  }

  addListener(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  removeListener(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      callback(data);
    });
  }
}

// 싱글톤 인스턴스
export const socketService = new SocketService();

// 훅 형태로 사용할 수 있는 함수
export function useSocket() {
  return socketService;
}