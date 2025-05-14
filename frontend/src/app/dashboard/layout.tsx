// src/app/dashboard/layout.tsx
'use client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-indigo-700 text-white">
        <div className="p-4 border-b border-indigo-800">
          <h2 className="text-xl font-bold">Jacob Kanban</h2>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <a href="/dashboard" className="block py-2 px-4 rounded hover:bg-indigo-600">
                대시보드
              </a>
            </li>
            <li>
              <a href="/tasks" className="block py-2 px-4 rounded hover:bg-indigo-600">
                작업
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="flex-1">
        <header className="bg-white shadow p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">교육용 칸반 보드</h1>
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/auth/login';
              }}
              className="px-4 py-1 bg-red-500 text-white rounded"
            >
              로그아웃
            </button>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}