// src/types/index.ts
// 기본 ID 타입
export type ID = number;

// 사용자 관련 타입
export interface User {
  id: ID;
  username: string;
  is_teacher: boolean;
  email?: string;
}

export interface UserLoginRequest {
  username: string;
  password: string;
}

export interface UserRegisterRequest {
  username: string;
  password: string;
  is_teacher: boolean;
  email?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Task 관련 타입
export type TaskStage =
  | 'todo'
  | 'requirements'
  | 'design'
  | 'implementation'
  | 'testing'
  | 'review'
  | 'done';

export interface Task {
  id: ID;
  title: string;
  description?: string;
  user_id: ID;
  stage: TaskStage;
  expected_time?: number;
  started_at?: string;
  completed_at?: string;
  current_stage_started_at?: string;
  help_needed: boolean;
  help_requested_at?: string;
  help_message?: string;
  is_delayed: boolean;
}

export interface TaskCreate {
  title: string;
  description?: string;
  user_id: ID;
  stage?: TaskStage;
  expected_time?: number;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  stage?: TaskStage;
  expected_time?: number;
}

// 단계 이동 타입
export interface StageMove {
  stage: TaskStage;
  comment?: string;
}

// 도움 요청 타입
export interface HelpRequest {
  id: ID;
  task_id: ID;
  user_id: ID;
  message?: string;
  requested_at: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: ID;
  resolution_message?: string;
  resolver_name?: string;
  task_title?: string;
  username?: string;
}

export interface CreateHelpRequestPayload {
  task_id: number;
  message: string;
}

export interface ResolveHelpRequestPayload {
  resolved: boolean;
  resolution_message: string;
}

// 이벤트 타입
export interface TaskUpdateEvent {
  task_id: ID;
  type: 'stage_change' | 'help_request' | 'delay_detected';
  data: any;
}
