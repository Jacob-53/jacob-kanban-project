// src/hooks/useHelpRequests.ts
import { useState, useCallback } from 'react';
import {
  HelpRequest,
  CreateHelpRequestPayload,
  ResolveHelpRequestPayload,
  getHelpRequests,
  getHelpRequest,
  createHelpRequest,
  resolveHelpRequest,
} from '../api/helpRequests';

interface UseHelpRequestsResult {
  helpRequests: HelpRequest[];
  loading: boolean;
  error: Error | null;
  fetchList: (resolved: boolean) => Promise<void>;
  fetchById: (id: number) => Promise<HelpRequest | null>;
  create: (payload: CreateHelpRequestPayload) => Promise<HelpRequest | null>;
  resolve: (id: number, payload: ResolveHelpRequestPayload) => Promise<HelpRequest | null>;
}

export const useHelpRequests = (token: string): UseHelpRequestsResult => {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async (resolved: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHelpRequests(resolved, token);
      setHelpRequests(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchById = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHelpRequest(id, token);
      return data;
    } catch (err: any) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const create = useCallback(async (payload: CreateHelpRequestPayload) => {
    setLoading(true);
    setError(null);
    try {
      const newReq = await createHelpRequest(payload, token);
      // 새로 만든 요청은 목록에 추가
      setHelpRequests(prev => [newReq, ...prev]);
      return newReq;
    } catch (err: any) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const resolve = useCallback(async (id: number, payload: ResolveHelpRequestPayload) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await resolveHelpRequest(id, payload, token);
      // 목록에서 상태 업데이트
      setHelpRequests(prev =>
        prev.map(hr => (hr.id === id ? updated : hr))
      );
      return updated;
    } catch (err: any) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    helpRequests,
    loading,
    error,
    fetchList,
    fetchById,
    create,
    resolve,
  };
};
