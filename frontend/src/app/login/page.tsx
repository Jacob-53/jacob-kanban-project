'use client';

import LoginForm from '@/components/common/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4 text-center">로그인</h1>
        <LoginForm />
      </div>
    </div>
  );
}
