// src/hooks/useHelpRequests.ts
import { useState, useCallback } from 'react';
import type {
  HelpRequest,
  CreateHelpRequestPayload,
  ResolveHelpRequestPayload
} from '@/types'; // ✅ 타입은 types에서

import {
  getHelpRequests,
  getHelpRequest,
  createHelpRequest,
  resolveHelpRequest
} from '../api/helpRequests'; // ✅ 함수는 api에서

interface UseHelpRequestsResult {
  helpRequests: HelpRequest[];
  loading: boolean;
  error: Error | null;
  fetchList: (resolved: boolean) => Promise<void>;
  fetchById: (id: number) => Promise<HelpRequest | null>;
  create: (payload: CreateHelpRequestPayload) => Promise<HelpRequest | null>;
  resolve: (id: number, payload: ResolveHelpRequestPayload) => Promise<HelpRequest | null>;
}

export const useHelpRequests = (): UseHelpRequestsResult => {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async (resolved: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHelpRequests(resolved);
      setHelpRequests(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchById = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHelpRequest(id);
      return data;
    } catch (err: any) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: CreateHelpRequestPayload) => {
    setLoading(true);
    setError(null);
    try {
      const newReq = await createHelpRequest(payload);
      setHelpRequests(prev => [newReq, ...prev]);
      return newReq;
    } catch (err: any) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const resolve = useCallback(async (id: number, payload: ResolveHelpRequestPayload) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await resolveHelpRequest(id, payload);
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
  }, []);

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
