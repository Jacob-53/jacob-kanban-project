'use client';

import { useRouter } from 'next/navigation';
import HelpRequestForm from '@/components/common/HelpRequestForm';
import { useHelpRequests } from '@/hooks/useHelpRequests';
import { useAuth } from '@/hooks/useAuth';

export default function NewHelpRequestPage() {
  const { token } = useAuth();
  const { create } = useHelpRequests(token);
  const router = useRouter();

  // 예시: 현재 보고 있는 taskId를 쿼리나 Context에서 가져올 수도 있고,
  // 고정값(4)으로 해두고 나중에 동적으로 바꿀 수 있습니다.
  const taskId = 4;

  const handleCreate = async (payload: { task_id: number; message: string }) => {
    await create(payload);
    // 생성 후 목록으로 돌아가기
    router.push('/help-requests');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">새 도움 요청</h1>
      <HelpRequestForm taskId={taskId} onSubmit={handleCreate} />
    </div>
  );
}
