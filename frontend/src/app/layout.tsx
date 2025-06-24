// src/app/layout.tsx (기존 코드 + WebSocketProvider만 추가)
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import WebSocketProvider from '@/components/providers/WebSocketProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '교육용 칸반 보드',
  description: '실시간 학습 과업 진행 도우미',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      {/* 화면 전체를 flex 레이아웃으로, 최소 높이를 화면 높이로 설정 */}
      <body className={`${inter.className} flex min-h-screen`}>
        {/* WebSocket 초기화 Provider로 감싸기 */}
        <WebSocketProvider>
          {/* 2) 메인 컨텐츠: 사이드바 옆에 flex-1로 채움 */}
          <main className="flex-1">
            {children}
          </main>
        </WebSocketProvider>
      </body>
    </html>
  );
}