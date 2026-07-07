import { create } from 'zustand';
import type { RouteAndRunResponse } from '@/api/agent';
import type { CtreCompileProgressView } from '@/features/agent/ctre/types';
import type { TaskLeaseEchoV1 } from '@/types/task-lease';

export type PlanningTaskStatus = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface PlanningTaskState {
  taskId: string | null;
  status: PlanningTaskStatus;
  currentPhase: string;
  progressPercentage: number;
  message: string;
  resultData: RouteAndRunResponse | null;
  pollPath: string | null;
  taskLease: TaskLeaseEchoV1 | null;
  /** SSE ctre_compilation 或 result.state.metadata.ctre_compile_progress */
  ctreCompilation: CtreCompileProgressView | null;
  setTask: (patch: Partial<PlanningTaskState>) => void;
  reset: () => void;
}

const initialData: Omit<PlanningTaskState, 'setTask' | 'reset'> = {
  taskId: null,
  status: 'IDLE',
  currentPhase: '',
  progressPercentage: 0,
  message: '',
  resultData: null,
  pollPath: null,
  taskLease: null,
  ctreCompilation: null,
};

export const usePlanningTaskStore = create<PlanningTaskState>((set) => ({
  ...initialData,
  setTask: (patch) => set((s) => ({ ...s, ...patch })),
  reset: () => set(initialData),
}));
