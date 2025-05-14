// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
        {/* 2) 메인 컨텐츠: 사이드바 옆에 flex-1로 채움 */}
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
