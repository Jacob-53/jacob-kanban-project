'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useHelpRequests } from '@/hooks/useHelpRequests';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function HelpRequestsPage() {
  const searchParams = useSearchParams();
  const resolvedFilter = searchParams.get('resolved') === 'true';

  const token = useAuthStore((state) => state.token);
  const { helpRequests, fetchList, loading, error } = useHelpRequests(token || '');

  useEffect(() => {
    if (token) {
      fetchList(resolvedFilter);
    }
  }, [fetchList, resolvedFilter, token]);

  if (!token) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4 text-gray-500">Login is required.</p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (loading) return <p className="p-6 text-center">Loading help requests...</p>;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error.message}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">
        {resolvedFilter ? 'Resolved Help Requests' : 'Open Help Requests'}
      </h1>

      <ul className="space-y-4">
        {helpRequests.map((req) => (
          <li key={req.id} className="border rounded-lg p-4 hover:shadow">
            <Link
              href={`/help-requests/${req.id}`}
              className="text-lg font-medium text-blue-600 hover:underline"
            >
              [{req.id}] {req.task_title}
            </Link>
            <p className="mt-1">{req.message}</p>
            <div className="mt-2 text-sm text-gray-500">
              <span>By {req.username}</span>
              <span className="mx-2">·</span>
              <span>
                Requested at {new Date(req.requested_at).toLocaleString()}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {helpRequests.length === 0 && (
        <p className="mt-6 text-center text-gray-500">
          {resolvedFilter
            ? 'No resolved help requests.'
            : 'No open help requests.'}
        </p>
      )}

      <div className="mt-6">
        <Link
          href="/help-requests/new"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          New Help Request
        </Link>
      </div>
    </div>
  );
}
