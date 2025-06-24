// src/utils/tokenUtils.ts
export function getAuthToken(): string | null {
  try {
    // 1. 먼저 기존 방식으로 확인 (localStorage 'token')
    const directToken = localStorage.getItem('token');
    if (directToken) {
      console.log('📋 직접 토큰 발견:', directToken.substring(0, 20) + '...');
      return directToken;
    }

    // 2. Zustand persist 방식으로 확인 (auth-storage)
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const token = parsed.state?.token;
      if (token) {
        console.log('📋 Zustand 저장소에서 토큰 발견:', token.substring(0, 20) + '...');
        return token;
      }
    }

    console.log('📋 토큰을 찾을 수 없음');
    return null;
  } catch (error) {
    console.error('토큰 추출 오류:', error);
    return null;
  }
}

export function debugTokenStorage() {
  console.log('=== 토큰 저장소 디버그 ===');
  
  const directToken = localStorage.getItem('token');
  console.log('직접 토큰:', directToken ? directToken.substring(0, 20) + '...' : '없음');
  
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      console.log('auth-storage 구조:', {
        hasState: !!parsed.state,
        hasToken: !!parsed.state?.token,
        hasUser: !!parsed.state?.user,
        isAuthenticated: !!parsed.state?.isAuthenticated
      });
      if (parsed.state?.token) {
        console.log('Zustand 토큰:', parsed.state.token.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('auth-storage 파싱 오류:', error);
    }
  } else {
    console.log('auth-storage: 없음');
  }
}