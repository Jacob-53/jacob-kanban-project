'use client';

import { useState, FormEvent } from 'react';
import { CreateHelpRequestPayload } from '@/api/helpRequests';

interface Props {
  taskId: number;
  onSubmit: (payload: CreateHelpRequestPayload) => Promise<void>;
}

export default function HelpRequestForm({ taskId, onSubmit }: Props) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({ task_id: taskId, message });
      setMessage('');
    } catch (err: any) {
      setError(err.message || '요청 생성 중 에러가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        className="w-full border rounded p-2"
        rows={4}
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="도움이 필요한 내용을 입력하세요."
        required
      />
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className={`px-4 py-2 rounded ${
          submitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
        } text-white`}
      >
        {submitting ? '전송 중…' : '도움 요청하기'}
      </button>
    </form>
  );
}
