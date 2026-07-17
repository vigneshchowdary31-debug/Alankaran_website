export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

export type LoadingState = "idle" | "loading" | "success" | "error";
