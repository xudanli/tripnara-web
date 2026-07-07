import { create } from 'zustand';
import type { ExecuteAsyncTaskResponse } from '@/api/planning-workbench';
import { extractWorkbenchCtreFromTaskStatus } from '@/features/agent/ctre/workbench-helpers';
import type { WorkbenchCtreUiOutput } from '@/features/agent/ctre/types';

export interface WorkbenchCtreTaskState {
  taskId: string | null;
  taskStatus: ExecuteAsyncTaskResponse['status'] | null;
  currentStage: string;
  ctre: WorkbenchCtreUiOutput | null;
  syncFromTaskStatus: (taskId: string, status: ExecuteAsyncTaskResponse) => void;
  syncFromExecuteResult: (ctre: unknown) => void;
  reset: () => void;
}

const initial = {
  taskId: null as string | null,
  taskStatus: null as WorkbenchCtreTaskState['taskStatus'],
  currentStage: '',
  ctre: null as WorkbenchCtreUiOutput | null,
};

export const useWorkbenchCtreTaskStore = create<WorkbenchCtreTaskState>((set) => ({
  ...initial,
  syncFromTaskStatus: (taskId, status) => {
    const stage =
      status.currentStage?.trim() ||
      status.stage?.trim() ||
      status.progress?.current?.trim() ||
      '';
    const ctre = extractWorkbenchCtreFromTaskStatus(status);
    set({
      taskId,
      taskStatus: status.status,
      currentStage: stage,
      ...(ctre ? { ctre } : {}),
    });
  },
  syncFromExecuteResult: (raw) => {
    const ctre = extractWorkbenchCtreFromTaskStatus({ ctre: raw });
    if (ctre) set({ ctre });
  },
  reset: () => set(initial),
}));
