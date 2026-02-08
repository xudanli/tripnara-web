/**
 * Planning Assistant V2 - 异步任务 Hook
 * 
 * 用于轮询异步任务状态（如方案生成）
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  plansApi,
  type TaskStatusResponse,
} from '@/api/planning-assistant-v2';

export interface UseAsyncTaskV2Return {
  taskStatus: TaskStatusResponse | undefined;
  isPolling: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  progress: number;
  error: Error | null;
  refetch: () => void;
}

/**
 * Planning Assistant V2 异步任务 Hook
 */
export function useAsyncTaskV2(taskId: string | null): UseAsyncTaskV2Return {
  const [isPolling, setIsPolling] = useState(false);

  const {
    data: taskStatus,
    refetch,
    error,
  } = useQuery({
    queryKey: ['planning-task-v2', taskId],
    queryFn: () => plansApi.getTaskStatus(taskId!),
    enabled: !!taskId && isPolling,
    refetchInterval: (query) => {
      const data = query.state.data as TaskStatusResponse | undefined;
      if (data?.status === 'completed' || data?.status === 'failed') {
        setIsPolling(false);
        return false;
      }
      return 2000; // 每2秒轮询一次
    },
  });

  useEffect(() => {
    if (taskId) {
      setIsPolling(true);
    } else {
      setIsPolling(false);
    }
  }, [taskId]);

  const isCompleted = taskStatus?.status === 'completed';
  const isFailed = taskStatus?.status === 'failed';
  const progress = taskStatus?.progress || 0;

  return {
    taskStatus,
    isPolling,
    isCompleted,
    isFailed,
    progress,
    error: (error as Error) || null,
    refetch,
  };
}
