// src/lib/websocket.ts (강화된 디버깅 버전)
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { useHelpRequestStore } from '@/store/helpRequestStore';

interface WebSocketMessage {
  type?: string;
  data?: any;
  error?: string;
  message?: string;
  count?: number;
}

type EventListener = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnecting = false;
  private isAuthenticated = false;
  private debugMode = true; // 🔍 디버깅 모드 활성화
  
  private eventListeners: Map<string, EventListener[]> = new Map();

  // 🔍 디버깅 로그 메서드
  private debugLog(level: 'info' | 'warn' | 'error', message: string, ...args: any[]) {
    if (!this.debugMode) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[WS-${level.toUpperCase()}] ${timestamp}`;
    
    switch (level) {
      case 'info':
        console.log(`🔵 ${prefix}:`, message, ...args);
        break;
      case 'warn':
        console.warn(`🟡 ${prefix}:`, message, ...args);
        break;
      case 'error':
        console.error(`🔴 ${prefix}:`, message, ...args);
        break;
    }
  }

  addListener(event: string, callback: EventListener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
    this.debugLog('info', `이벤트 리스너 등록: ${event}`);
  }

  removeListener(event: string, callback: EventListener) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        this.debugLog('info', `이벤트 리스너 제거: ${event}`);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      this.debugLog('info', `이벤트 발생: ${event}`, { data, listenerCount: listeners.length });
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.debugLog('error', `이벤트 리스너 오류 (${event}):`, error);
        }
      });
    }
  }

  connect(token?: string) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      this.debugLog('warn', '이미 연결 중이거나 연결되어 있음');
      return;
    }

    // 🔍 토큰 검증 강화
    const authToken = token || this.getTokenFromStorage();
    this.debugLog('info', '토큰 추출 시도...', { 
      hasDirectToken: !!token,
      tokenLength: authToken?.length || 0,
      tokenPrefix: authToken?.substring(0, 20) || 'NO_TOKEN'
    });

    if (!authToken) {
      this.debugLog('error', '토큰이 없어서 WebSocket 연결을 할 수 없습니다');
      this.emit('connection_failed', { reason: 'No token' });
      return;
    }

    // 🔍 JWT 토큰 형식 검증
    if (!this.isValidJWTFormat(authToken)) {
      this.debugLog('error', '잘못된 JWT 토큰 형식', { tokenStart: authToken.substring(0, 50) });
      this.emit('connection_failed', { reason: 'Invalid token format' });
      return;
    }

    this.isConnecting = true;
    const wsUrl = this.getWebSocketUrl();
    this.debugLog('info', 'WebSocket 연결 시도 중...', { url: wsUrl });

    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = (event) => {
        this.debugLog('info', 'WebSocket 연결됨', { readyState: this.ws?.readyState });
        this.isConnecting = false;
        
        // 🔍 인증 메시지 전송 강화
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          // 여러 가지 인증 메시지 형식 시도
          const authFormats = [
            // 형식 1: 단순 토큰
            authToken,
            // 형식 2: JSON 객체
            JSON.stringify({ token: authToken }),
            // 형식 3: type과 함께
            JSON.stringify({ type: 'auth', token: authToken }),
            // 형식 4: authenticate 타입
            JSON.stringify({ type: 'authenticate', token: authToken }),
            // 형식 5: authorization
            JSON.stringify({ type: 'authorization', token: authToken }),
            // 형식 6: Bearer 형식
            JSON.stringify({ type: 'auth', authorization: `Bearer ${authToken}` })
          ];
          
          // 1초 후 JSON 형식들 시도
          setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isAuthenticated) {
              authFormats.slice(1).forEach((format, index) => {
                setTimeout(() => {
                  if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isAuthenticated) {
                    this.debugLog('info', `🔐 인증 형식 ${index + 2} 시도:`, format);
                    this.ws.send(format);
                  }
                }, index * 500); // 0.5초 간격
              });
            }
          }, 1000);
        }
      };

      this.ws.onmessage = (event) => {
        this.debugLog('info', 'WebSocket 메시지 수신');
        this.debugLog('info', '📨 RAW 데이터:', event.data);
        this.debugLog('info', '📨 데이터 타입:', typeof event.data);
        this.debugLog('info', '📨 데이터 길이:', event.data?.length || 0);

        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.debugLog('info', '📨 파싱된 메시지 전체:', JSON.stringify(message, null, 2));
          this.debugLog('info', '📨 메시지 타입:', message.type || 'UNDEFINED');
          this.debugLog('info', '📨 메시지 키들:', Object.keys(message));
          this.handleMessage(message);
        } catch (error) {
          // JSON이 아닌 메시지 처리
          if (event.data === 'pong') {
            this.debugLog('info', 'Pong 수신');
            return;
          }
          this.debugLog('error', '메시지 파싱 오류:', error);
          this.debugLog('error', '파싱 실패한 원본 데이터:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        this.debugLog('error', 'WebSocket 연결 종료', { 
          code: event.code, 
          reason: event.reason,
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });
        
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.ws = null;
        
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // 🔍 종료 코드별 상세 분석
        this.analyzeCloseCode(event.code, event.reason);
        
        // 재연결 로직
        if (event.code !== 1008 && event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (event.code === 1008) {
          this.debugLog('error', '🚫 인증 오류로 인한 연결 종료 - 토큰을 확인해주세요');
          this.emit('connection_failed', { reason: 'Authentication failed', code: 1008 });
        }
      };

      this.ws.onerror = (error) => {
        this.debugLog('error', 'WebSocket 오류:', error);
        this.isConnecting = false;
        this.emit('connection_failed', { reason: 'Connection error', error });
      };

    } catch (error) {
      this.debugLog('error', 'WebSocket 연결 생성 오류:', error);
      this.isConnecting = false;
      this.emit('connection_failed', { reason: 'Failed to create connection', error });
    }
  }

  // 🔍 JWT 토큰 형식 검증
  private isValidJWTFormat(token: string): boolean {
    // JWT는 세 부분이 점(.)으로 구분됨
    const parts = token.split('.');
    const isValid = parts.length === 3 && 
                   parts.every(part => part.length > 0) &&
                   token.startsWith('eyJ'); // JWT 헤더는 보통 eyJ로 시작

    this.debugLog('info', 'JWT 형식 검증', { 
      isValid, 
      partsCount: parts.length,
      startsWithEyJ: token.startsWith('eyJ'),
      tokenSample: token.substring(0, 50) + '...'
    });

    return isValid;
  }

  // 🔍 WebSocket URL 생성
  private getWebSocketUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // HTTP/HTTPS를 WS/WSS로 변환
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/events';
    
    this.debugLog('info', 'WebSocket URL 생성', { 
      baseUrl, 
      wsUrl,
      environment: process.env.NODE_ENV 
    });
    
    return wsUrl;
  }

  // 🔍 종료 코드 분석
  private analyzeCloseCode(code: number, reason: string) {
    const codeMessages: Record<number, string> = {
      1000: '정상 종료',
      1001: '엔드포인트 제거됨',
      1002: '프로토콜 오류',
      1003: '지원되지 않는 데이터 타입',
      1005: '상태 코드 없음',
      1006: '비정상 종료',
      1007: '잘못된 데이터',
      1008: '정책 위반 (인증 실패)',
      1009: '메시지가 너무 큼',
      1010: '확장 협상 실패',
      1011: '서버 오류',
      1015: 'TLS 핸드셰이크 실패'
    };

    const codeMessage = codeMessages[code] || '알 수 없는 오류';
    
    this.debugLog('error', `종료 코드 분석: ${code} - ${codeMessage}`, { 
      code, 
      reason, 
      codeMessage,
      isAuthError: code === 1008
    });

    // 인증 오류인 경우 토큰 상태 재확인
    if (code === 1008) {
      this.debugTokenStatus();
    }
  }

  // 🔍 토큰 상태 디버깅
  public debugTokenStatus() {
    this.debugLog('info', '=== 토큰 상태 디버깅 시작 ===');
    
    // localStorage 직접 확인
    const directToken = localStorage.getItem('token');
    this.debugLog('info', 'localStorage "token":', { 
      exists: !!directToken,
      length: directToken?.length || 0,
      sample: directToken?.substring(0, 30) || 'NONE'
    });

    // auth-storage 확인
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        this.debugLog('info', 'auth-storage 내용:', {
          hasState: !!parsed.state,
          hasToken: !!parsed.state?.token,
          hasUser: !!parsed.state?.user,
          isAuthenticated: !!parsed.state?.isAuthenticated
        });
      } catch (e) {
        this.debugLog('error', 'auth-storage 파싱 오류:', e);
      }
    }

    // Zustand store 상태 확인
    try {
      const authState = useAuthStore.getState();
      this.debugLog('info', 'Zustand authStore 상태:', {
        hasUser: !!authState.user,
        isAuthenticated: authState.isAuthenticated,
        hasToken: !!(authState as any).token // token이 있다면
      });
    } catch (e) {
      this.debugLog('warn', 'Zustand store 접근 불가:', e);
    }

    this.debugLog('info', '=== 토큰 상태 디버깅 종료 ===');
  }

  // 통합된 토큰 추출 방식 (디버깅 강화)
  private getTokenFromStorage(): string | null {
    this.debugLog('info', '토큰 추출 시작...');
    
    try {
      // 1. 직접 토큰 확인
      const directToken = localStorage.getItem('token');
      if (directToken) {
        this.debugLog('info', '직접 토큰 발견', { 
          length: directToken.length,
          sample: directToken.substring(0, 20) + '...',
          isValidFormat: this.isValidJWTFormat(directToken)
        });
        return directToken;
      }

      // 2. Zustand persist 방식 확인
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const token = parsed.state?.token;
        if (token) {
          this.debugLog('info', 'Zustand 저장소에서 토큰 발견', { 
            length: token.length,
            sample: token.substring(0, 20) + '...',
            isValidFormat: this.isValidJWTFormat(token)
          });
          return token;
        }
      }

      // 3. Zustand store에서 직접 확인
      try {
        const authState = useAuthStore.getState();
        const storeToken = (authState as any).token;
        if (storeToken) {
          this.debugLog('info', 'Zustand store에서 토큰 발견', {
            length: storeToken.length,
            sample: storeToken.substring(0, 20) + '...',
            isValidFormat: this.isValidJWTFormat(storeToken)
          });
          return storeToken;
        }
      } catch (e) {
        this.debugLog('warn', 'Zustand store 접근 중 오류:', e);
      }

      this.debugLog('warn', '모든 위치에서 토큰을 찾을 수 없음');
      return null;
    } catch (error) {
      this.debugLog('error', '토큰 추출 중 오류:', error);
      return null;
    }
  }

  private handleMessage(message: WebSocketMessage) {
    this.debugLog('info', '=== 메시지 처리 시작 ===');
    this.debugLog('info', '메시지 전체 내용:', JSON.stringify(message, null, 2));
    
    // 메시지 타입이 없는 경우 추가 분석
    if (!message.type) {
      this.debugLog('warn', '메시지 타입이 없습니다. 다른 필드들 확인:');
      this.debugLog('warn', '- 사용 가능한 키들:', Object.keys(message));
      this.debugLog('warn', '- 전체 메시지:', message);
      
      // 일반적인 WebSocket 응답 패턴들 확인
      if (message.hasOwnProperty('status')) {
        this.debugLog('info', 'status 기반 메시지 감지:', message);
      }
      if (message.hasOwnProperty('event')) {
        this.debugLog('info', 'event 기반 메시지 감지:', message);
        // event를 type으로 사용
        message.type = (message as any).event;
      }
      if (message.hasOwnProperty('action')) {
        this.debugLog('info', 'action 기반 메시지 감지:', message);
        // action을 type으로 사용
        message.type = (message as any).action;
      }
      if (typeof message === 'string') {
        this.debugLog('info', '문자열 메시지 감지:', message);
        return;
      }
      
      // 여전히 타입이 없다면 에러로 처리하지 말고 내용 기반 추정
      if (!message.type) {
        this.debugLog('warn', '타입을 추정할 수 없는 메시지. 내용 기반 처리 시도');
        
        // 성공/실패 메시지 패턴 확인
        const msgStr = JSON.stringify(message).toLowerCase();
        if (msgStr.includes('success') || msgStr.includes('connected') || msgStr.includes('authenticated')) {
          this.debugLog('info', '성공 메시지로 추정됨');
          this.isAuthenticated = true;
          this.emit('connected', message);
          return;
        }
        if (msgStr.includes('error') || msgStr.includes('failed') || msgStr.includes('unauthorized')) {
          this.debugLog('error', '에러 메시지로 추정됨');
          this.emit('error', message);
          return;
        }
        
        // 기본 처리: 알 수 없는 메시지로 처리
        this.debugLog('warn', '알 수 없는 메시지 형식. 무시합니다.');
        return;
      }
    }

    this.debugLog('info', `메시지 타입으로 처리: ${message.type}`);

    switch (message.type) {
      case 'connection_established':
      case 'connected':
      case 'auth_success':
      case 'authenticated':
        this.debugLog('info', '✅ 연결 및 인증 성공:', message);
        this.isAuthenticated = true;
        this.reconnectAttempts = 0;
        this.emit('connected', message);
        break;
        
      case 'auth_failed':
      case 'authentication_failed':
      case 'unauthorized':
        this.debugLog('error', '❌ 인증 실패:', message);
        this.emit('auth_failed', message);
        break;
        
      case 'initial_help_requests':
        this.debugLog('info', `📋 초기 도움 요청 목록: ${message.count}개`);
        if (message.data && Array.isArray(message.data)) {
          const helpRequestStore = useHelpRequestStore.getState();
          message.data.forEach((helpRequest: any) => {
            helpRequestStore.addHelpRequest(helpRequest);
          });
        }
        break;
        
      case 'initial_delayed_tasks':
        this.debugLog('info', `⏰ 초기 지연된 태스크: ${message.count}개`);
        if (message.data && Array.isArray(message.data)) {
          const taskStore = useTaskStore.getState();
          message.data.forEach((task: any) => {
            taskStore.updateTaskInState(task);
          });
        }
        break;
        
      case 'initial_tasks':
        this.debugLog('info', `📝 초기 태스크 목록: ${message.count}개`);
        if (message.data && Array.isArray(message.data)) {
          const taskStore = useTaskStore.getState();
          message.data.forEach((task: any) => {
            taskStore.updateTaskInState(task);
          });
        }
        break;
        
      case 'task_updated':
        this.debugLog('info', '📝 태스크 업데이트:', message.data);
        if (message.data) {
          const taskStore = useTaskStore.getState();
          taskStore.updateTaskInState(message.data);
          this.emit('task_update', { task: message.data });
        }
        break;
        
      case 'help_request_created':
        this.debugLog('info', '🆘 새로운 도움 요청:', message.data);
        if (message.data) {
          const helpRequestStore = useHelpRequestStore.getState();
          helpRequestStore.addHelpRequest(message.data);
          this.emit('help_request_created', message.data);
        }
        break;
        
      case 'help_request_resolved':
        this.debugLog('info', '✅ 도움 요청 해결됨:', message.data);
        if (message.data && message.data.id) {
          const helpRequestStore = useHelpRequestStore.getState();
          helpRequestStore.updateHelpRequest(message.data.id, message.data);
          this.emit('help_request_resolved', message.data);
        }
        break;
        
      case 'task_delayed':
        this.debugLog('info', '⏰ 태스크 지연 감지:', message.data);
        if (message.data) {
          const taskStore = useTaskStore.getState();
          taskStore.updateTaskInState({
            ...message.data,
            is_delayed: true
          });
          this.emit('task_delayed', message.data);
        }
        break;
        
      case 'error':
        this.debugLog('error', '💥 서버 오류:', message.error);
        if (message.error === 'Invalid token' || message.error === 'Authentication failed') {
          this.debugLog('error', '🚫 유효하지 않은 토큰으로 인해 연결이 종료됩니다');
          this.debugTokenStatus(); // 토큰 상태 재확인
          this.disconnect();
        }
        this.emit('error', message);
        break;
        
      default:
        this.debugLog('warn', '📨 알 수 없는 메시지 타입:', message.type);
        this.debugLog('warn', '전체 메시지:', message);
        
        // 알 수 없는 타입이지만 처리 시도
        this.emit('unknown_message', message);
    }
    
    this.debugLog('info', '=== 메시지 처리 완료 ===');
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    this.debugLog('warn', `🔄 WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect();
      } else {
        this.debugLog('error', '💥 최대 재연결 시도 횟수 초과');
        this.emit('connection_failed', { reason: 'Max reconnect attempts exceeded' });
      }
    }, this.reconnectInterval);
  }

  sendMessage(type: string, data?: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.debugLog('warn', '🚫 WebSocket이 준비되지 않음', {
        hasWs: !!this.ws,
        readyState: this.ws?.readyState,
        isAuthenticated: this.isAuthenticated
      });
      return;
    }

    const message = { type, data };
    this.ws.send(JSON.stringify(message));
    this.debugLog('info', '📤 메시지 전송:', message);
  }

  ping() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send('ping');
      this.debugLog('info', '🏓 Ping 전송');
    }
  }

  sendPing() {
    this.ping();
  }

  disconnect() {
    if (this.ws) {
      this.debugLog('info', '🔌 WebSocket 연결 종료');
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
  }

  getConnectionState() {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  // 🔍 디버깅 모드 토글
  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    this.debugLog('info', `디버깅 모드 ${enabled ? '활성화' : '비활성화'}`);
  }

  // 🔍 현재 상태 요약
  getDebugInfo() {
    const info = {
      connectionState: this.getConnectionState(),
      isAuthenticated: this.isAuthenticated,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      hasToken: !!this.getTokenFromStorage(),
      listenerCount: Array.from(this.eventListeners.entries()).map(([event, listeners]) => ({
        event,
        count: listeners.length
      }))
    };
    
    this.debugLog('info', '🔍 WebSocket 상태 요약:', info);
    return info;
  }
}

// 싱글톤 인스턴스
export const webSocketService = new WebSocketService();

// React Hook
export function useWebSocket() {
  const { user, isAuthenticated } = useAuthStore();

  const connect = () => {
    // authStore에서 토큰을 직접 가져오도록 수정 필요
    const token = (useAuthStore.getState() as any).token || 
                  localStorage.getItem('token');
    
    if (token && isAuthenticated) {
      webSocketService.connect(token);
    } else {
      console.warn('🚫 토큰이 없거나 인증되지 않아서 WebSocket 연결을 시도할 수 없습니다');
      webSocketService.debugTokenStatus();
    }
  };

  const disconnect = () => {
    webSocketService.disconnect();
  };

  const sendMessage = (type: string, data?: any) => {
    webSocketService.sendMessage(type, data);
  };

  const sendPing = () => {
    webSocketService.sendPing();
  };

  const getDebugInfo = () => {
    return webSocketService.getDebugInfo();
  };

  const debugTokenStatus = () => {
    return webSocketService.debugTokenStatus();
  };

  return {
    connect,
    disconnect,
    sendMessage,
    sendPing,
    getDebugInfo,
    debugTokenStatus,
    isConnected: webSocketService.isConnected(),
    connectionState: webSocketService.getConnectionState(),
    addListener: webSocketService.addListener.bind(webSocketService),
    removeListener: webSocketService.removeListener.bind(webSocketService),
    setDebugMode: webSocketService.setDebugMode.bind(webSocketService)
  };
}