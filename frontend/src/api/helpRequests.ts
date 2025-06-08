// src/api/helpRequests.ts
import axios from 'axios';

// Base URL: 로컬 테스트용
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청·응답 타입 정의
export interface HelpRequest {
  id: number;
  task_id: number;
  user_id: number;
  username: string;
  task_title: string;
  message: string;
  requested_at: string;   // ISO timestamp
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  resolver_name: string | null;
  resolution_message: string | null;
}

export interface CreateHelpRequestPayload {
  task_id: number;
  message: string;
}

export interface ResolveHelpRequestPayload {
  resolved: boolean;
  resolution_message: string;
}

// API 함수
/**
 * 새 Help Request 생성
 */
export const createHelpRequest = async (
  payload: CreateHelpRequestPayload,
  token: string
): Promise<HelpRequest> => {
  const { data } = await api.post<HelpRequest>(
    '/help-requests/',
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

/**
 * Help Request 목록 조회
 * @param resolved 필터: true/false
 */
export const getHelpRequests = async (
  resolved: boolean,
  token: string
): Promise<HelpRequest[]> => {
  const { data } = await api.get<HelpRequest[]>(
    '/help-requests/',
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { resolved },
    }
  );
  return data;
};

/**
 * 단건 조회
 */
export const getHelpRequest = async (
  id: number,
  token: string
): Promise<HelpRequest> => {
  const { data } = await api.get<HelpRequest>(
    `/help-requests/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

/**
 * 해결 처리
 */
export const resolveHelpRequest = async (
  id: number,
  payload: ResolveHelpRequestPayload,
  token: string
): Promise<HelpRequest> => {
  const { data } = await api.put<HelpRequest>(
    `/help-requests/${id}/resolve`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};
