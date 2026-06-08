import { create } from 'zustand';
import type { RouteAndRunResponse } from '@/api/agent';

export type PlanningTaskStatus = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface PlanningTaskState {
  taskId: string | null;
  status: PlanningTaskStatus;
  currentPhase: string;
  progressPercentage: number;
  message: string;
  resultData: RouteAndRunResponse | null;
  pollPath: string | null;
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
};

export const usePlanningTaskStore = create<PlanningTaskState>((set) => ({
  ...initialData,
  setTask: (patch) => set((s) => ({ ...s, ...patch })),
  reset: () => set(initialData),
}));
