import type { RouteAndRunResponse } from '@/api/agent';
import type { CtreCompileProgressView } from '@/features/agent/ctre/types';

/**
 * SSE channel: `route_and_run.task.{taskId}`，事件类型 `PHASE` / `RESULT` / `ERROR`。
 * 与后端 `RouteAndRunTaskProgressPayload` 对齐。
 */
export type RouteAndRunTaskProgressPayload = {
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
  /** PHASE + current_phase === 'TRAVEL_COMPILE' 时推送 CTRE 细粒度进度 */
  ctre_compilation?: CtreCompileProgressView;
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
