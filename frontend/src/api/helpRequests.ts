// src/api/helpRequests.ts
import axios, { AxiosHeaders } from 'axios';
import { HelpRequest, CreateHelpRequestPayload, ResolveHelpRequestPayload } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (config.headers && config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    (config.headers as any) = {
      ...config.headers,
      Authorization: token ? `Bearer ${token}` : undefined,
    };
  }

  return config;
});

export default api;

export const getHelpRequests = async (
  resolved: boolean
): Promise<HelpRequest[]> => {
  const { data } = await api.get('/help-requests/', {
    params: { resolved },
  });
  return data;
};

export const getHelpRequest = async (
  id: number
): Promise<HelpRequest> => {
  const { data } = await api.get(`/help-requests/${id}`);
  return data;
};

export const createHelpRequest = async (
  payload: CreateHelpRequestPayload
): Promise<HelpRequest> => {
  const { data } = await api.post('/help-requests/', payload);
  return data;
};

export const resolveHelpRequest = async (
  id: number,
  payload: ResolveHelpRequestPayload
): Promise<HelpRequest> => {
  const { data } = await api.put(`/help-requests/${id}/resolve`, payload);
  return data;
};
