// src/hooks/useAuth.tsx
import { createContext, useContext, useEffect, useState } from 'react'

export interface User {
  id: number
  username: string
  is_teacher: boolean
  class_id?: number   // ← 여기에 class_id 추가
}

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // 1) 로그인 시 token 저장 후 바로 내 정보(fetchMe) 호출
  async function login(username: string, password: string) {
    const resp = await fetch('/auth/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: `username=${username}&password=${password}`,
    })
    const { access_token } = await resp.json()
    setToken(access_token)
    await fetchMe(access_token)   // 토큰 붙여서 내 정보 가져오기
  }

  // 2) 내 정보(fetchMe)에서 class_id까지 포함
  async function fetchMe(jwt: string) {
    const resp = await fetch('/users/me', {
      headers: { Authorization: `Bearer ${jwt}` }
    })
    const me: User = await resp.json()
    setUser(me)
  }

  function logout() {
    setUser(null)
    setToken(null)
  }

  // 3) 새로고침 시 localStorage에서 token 꺼내고 fetchMe
  useEffect(() => {
    const saved = localStorage.getItem('token')
    if (saved) {
      setToken(saved)
      fetchMe(saved)
    }
  }, [])

  // 4) 토큰이 바뀌면 localStorage에 저장
  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
