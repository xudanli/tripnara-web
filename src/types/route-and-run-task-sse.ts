import type { RouteAndRunResponse } from '@/api/agent';

/** SSE `event: message` 的 data JSON */
export type RouteAndRunTaskSsePayload = {
  task_id: string;
  request_id: string;
  type: 'PHASE' | 'RESULT' | 'ERROR';
  current_phase: string;
  progress_percentage: number;
  message: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  ts: string;
  error?: string;
  /** 仅 type === 'RESULT' */
  data?: RouteAndRunResponse | null;
  intake_stream?: Record<string, unknown>;
  fed_sse?: Record<string, unknown>[];
  /** PHASE + current_phase === 'NARRATE' 时提前下发 */
  emotional_context?: import('@/types/emotional-context').EmotionalContextClient;
  emotionalContext?: import('@/types/emotional-context').EmotionalContextClient;
};

/** POST .../route_and_run/async 202 */
export type RouteAndRunTaskInit = {
  task_id: string;
  status: 'PENDING' | 'PROCESSING';
  current_phase: string;
  progress_percentage: number;
  message: string;
  data: null;
  request_id: string;
};
