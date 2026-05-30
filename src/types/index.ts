export type CheckStatus = 'up' | 'down';
export type NodeEnv = 'development' | 'production' | 'test';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  check_interval_seconds: number;
  expected_status_code: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Check {
  id: string;
  monitor_id: string;
  status: CheckStatus;
  response_time_ms: number | null;
  failure_reason: string | null;
  status_code_received: number | null;
  checked_at: Date;
}

export interface CheckResponse {
  id: string;
  status: CheckStatus;
  response_time_ms: number | null;
  failure_reason: string | null;
  status_code_received: number | null;
  checked_at: Date;
}

export interface Alert {
  id: string;
  monitor_id: string;
  triggered_at: Date;
  resolved_at: Date | null;
}

export interface RegisterBody {
  email: string;
  username: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateMonitorBody {
  name: string;
  url: string;
  check_interval_seconds: number;
  expected_status_code: number;
}

export interface UpdateMonitorBody {
  name?: string;
  url?: string;
  check_interval_seconds?: number;
  expected_status_code?: number;
  is_active?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MonitorResponse {
  id: string;
  name: string;
  url: string;
  check_interval_seconds: number;
  expected_status_code: number;
  is_active: boolean;
  created_at: Date;
}

export interface PaginatedChecks {
  data: CheckResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload;
  }
}
