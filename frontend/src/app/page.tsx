// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // 기본 경로에서 로그인 페이지로 리디렉션
  redirect('/auth/login');
}