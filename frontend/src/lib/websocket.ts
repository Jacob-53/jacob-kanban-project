// src/lib/websocket.ts
import { getAuthToken } from '@/utils/tokenUtils';

type WebSocketEventCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<WebSocketEventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  constructor() {
    this.debugLog('info', 'WebSocketService 인스턴스 생성됨');
  }

  private debugLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const emoji = level === 'info' ? '🔵' : level === 'warn' ? '🟡' : '🔴';
    
    if (data) {
      console[level](`${emoji} [WS-${level.toUpperCase()}] ${timestamp}: ${message}`, data);
    } else {
      console[level](`${emoji} [WS-${level.toUpperCase()}] ${timestamp}: ${message}`);
    }
  }

  connect(): void {
    if (typeof window === 'undefined') {
      this.debugLog('warn', '서버 사이드에서는 WebSocket 연결 불가');
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      this.debugLog('warn', '이미 연결 중이거나 연결되어 있음');
      return;
    }

    this.debugLog('info', 'WebSocket 연결 시작...');

    // 토큰 추출
    const token = getAuthToken();
    if (!token) {
      this.debugLog('error', '인증 토큰이 없어 연결할 수 없음');
      return;
    }

    // JWT 형식 검증
    const isValidJWT = this.validateJWTFormat(token);
    this.debugLog('info', 'JWT 형식 검증', { 
      isValid: isValidJWT, 
      tokenSample: token.substring(0, 20) + '...' 
    });

    if (!isValidJWT) {
      this.debugLog('error', '유효하지 않은 JWT 토큰 형식');
      return;
    }

    // WebSocket URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/events';
    
    this.debugLog('info', 'WebSocket URL 생성', { baseUrl, wsUrl });

    try {
      // WebSocket 연결 생성
      this.ws = new WebSocket(wsUrl);
      this.debugLog('info', 'WebSocket 연결 시도 중...', { url: wsUrl });

      // 이벤트 리스너 등록
      this.setupEventListeners(token);

    } catch (error) {
      this.debugLog('error', 'WebSocket 연결 생성 실패', error);
    }
  }

  private validateJWTFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // JWT는 일반적으로 'eyJ'로 시작
    return token.startsWith('eyJ');
  }

  private setupEventListeners(token: string): void {
    if (!this.ws) return;

    // 연결 성공
    this.ws.onopen = () => {
      this.debugLog('info', 'WebSocket 연결됨', { readyState: this.ws?.readyState });
      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      // ✅ JSON 형식으로 인증 메시지 전송
      const authMessage = { token };
      this.debugLog('info', '인증 메시지 전송', { 
        tokenLength: token.length,
        tokenStart: token.substring(0, 15),
        tokenEnd: token.substring(token.length - 20),
        messageFormat: 'JSON'
      });

      try {
        this.ws?.send(JSON.stringify(authMessage));
        this.debugLog('info', '✅ JSON 인증 메시지 전송 성공');
      } catch (error) {
        this.debugLog('error', '인증 메시지 전송 실패', error);
      }

      // 연결 성공 이벤트 발생
      this.emitEvent('connected', { status: 'connected' });
    };

    // 메시지 수신
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.debugLog('info', '메시지 수신', { type: data.type, data });

        // 연결 확인 메시지
        if (data.type === 'connection_established') {
          this.debugLog('info', '🎉 WebSocket 인증 성공!', data);
          this.emitEvent('authenticated', data);
          return;
        }

        // 다른 이벤트들 처리
        if (data.type) {
          this.emitEvent(data.type, data);
        }

      } catch (error) {
        this.debugLog('warn', '메시지 파싱 실패 - 텍스트로 처리', { 
          raw: event.data, 
          error 
        });
        
        // pong 응답 처리
        if (event.data === 'pong') {
          this.debugLog('info', 'Pong 수신');
          return;
        }
      }
    };

    // 연결 종료
    this.ws.onclose = (event) => {
      this.debugLog('error', 'WebSocket 연결 종료', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: new Date().toISOString()
      });

      this.emitEvent('disconnected', { 
        code: event.code, 
        reason: event.reason 
      });

      this.analyzeCloseCode(event.code);
      this.scheduleReconnect();
    };

    // 오류 처리
    this.ws.onerror = (error) => {
      this.debugLog('error', 'WebSocket 오류 발생', error);
      this.emitEvent('connection_failed', { error });
    };
  }

  private analyzeCloseCode(code: number): void {
    const codeMessages: Record<number, string> = {
      1000: '정상 종료',
      1001: '엔드포인트 종료',
      1002: '프로토콜 오류',
      1003: '지원하지 않는 데이터',
      1006: '비정상 종료',
      1008: '정책 위반 (인증 실패)',
      1011: '서버 오류',
      1012: '서비스 재시작',
      1013: '일시적 과부하',
      1014: '잘못된 게이트웨이',
      1015: 'TLS 핸드셰이크 실패'
    };

    const message = codeMessages[code] || '알 수 없는 오류';
    const isAuthError = code === 1008;

    this.debugLog('error', `종료 코드 분석: ${code} - ${message}`, {
      code,
      reason: message,
      codeMessage: message,
      isAuthError
    });

    if (isAuthError) {
      this.debugLog('error', '🔐 인증 실패로 인한 연결 종료');
      // 인증 실패 시 재연결하지 않음
      return;
    }
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.debugLog('error', '최대 재연결 시도 횟수 초과');
      }
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.debugLog('warn', `🔄 WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    this.debugLog('info', `재연결 대기 시간: ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.isReconnecting = false;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.debugLog('info', 'WebSocket 연결 해제 요청');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isReconnecting = false;
  }

  // 핑 전송
  ping(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send('ping');
      this.debugLog('info', 'Ping 전송');
    }
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // 이벤트 리스너 추가
  addListener(event: string, callback: WebSocketEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    this.debugLog('info', `이벤트 리스너 등록: ${event}`);
  }

  // 이벤트 리스너 제거
  removeListener(event: string, callback: WebSocketEventCallback): void {
    this.listeners.get(event)?.delete(callback);
    this.debugLog('info', `이벤트 리스너 제거: ${event}`);
  }

  // 이벤트 발생
  private emitEvent(event: string, data: any): void {
    this.debugLog('info', `이벤트 발생: ${event}`, { data, listenerCount: this.listeners.get(event)?.size || 0 });
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this.debugLog('error', `이벤트 리스너 실행 오류 (${event})`, error);
      }
    });
  }
}

// 싱글톤 인스턴스
export const webSocketService = new WebSocketService();

// 편의 함수들
export { webSocketService as socketService };
export default webSocketService;