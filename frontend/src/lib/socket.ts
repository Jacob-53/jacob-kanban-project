// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { TaskUpdateEvent } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  
  connect() {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';
    
    this.socket = io(SOCKET_URL, {
      auth: {
        token
      }
    });
    
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    // 에러 처리
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    // 이벤트 리스너 설정
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
    
    // 태스크 업데이트 이벤트
    this.socket.on('task_update', (data: TaskUpdateEvent) => {
      this.notifyListeners('task_update', data);
    });
    
    // 도움 요청 이벤트
    this.socket.on('help_request', (data: any) => {
      this.notifyListeners('help_request', data);
    });
    
    // 지연 감지 이벤트
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

// 클라이언트 컴포넌트에서 사용하기 위한 hook
export function useSocket() {
  return socketService;
}