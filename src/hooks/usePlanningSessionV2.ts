/**
 * Planning Assistant V2 - 会话管理 Hook
 * 
 * 提供会话的创建、查询、删除和对话历史功能
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sessionsApi,
  type SessionState,
  type CreateSessionRequest,
} from '@/api/planning-assistant-v2';

const STORAGE_KEY = 'planning-assistant-v2-session';

export interface UsePlanningSessionV2Return {
  sessionId: string | null;
  sessionState: SessionState | undefined;
  isLoading: boolean;
  error: Error | null;
  createSession: (userId?: string) => Promise<string>;
  deleteSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Planning Assistant V2 会话管理 Hook
 */
export function usePlanningSessionV2(userId?: string): UsePlanningSessionV2Return {
  const queryClient = useQueryClient();
  
  // 从 localStorage 恢复会话ID
  const [sessionId, setSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || null;
  });

  // 创建会话
  const createMutation = useMutation({
    mutationFn: (data: CreateSessionRequest) => sessionsApi.create(data),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      localStorage.setItem(STORAGE_KEY, data.sessionId);
      queryClient.setQueryData(['planning-session-v2', data.sessionId], data);
    },
  });

  // 获取会话状态
  const {
    data: sessionState,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['planning-session-v2', sessionId],
    queryFn: () => sessionsApi.getState(sessionId!),
    enabled: !!sessionId,
    staleTime: 30000, // 30秒内不重新获取
  });

  // 删除会话
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onSuccess: () => {
      setSessionId(null);
      localStorage.removeItem(STORAGE_KEY);
      queryClient.removeQueries({ queryKey: ['planning-session-v2', sessionId] });
    },
  });

  const createSession = useCallback(
    async (userIdParam?: string): Promise<string> => {
      const result = await createMutation.mutateAsync({
        userId: userIdParam || userId,
      });
      return result.sessionId;
    },
    [userId, createMutation]
  );

  const deleteSession = useCallback(async () => {
    if (sessionId) {
      await deleteMutation.mutateAsync(sessionId);
    }
  }, [sessionId, deleteMutation]);

  const refreshSession = useCallback(async () => {
    if (sessionId) {
      await refetch();
    }
  }, [sessionId, refetch]);

  return {
    sessionId,
    sessionState,
    isLoading: isLoading || createMutation.isPending || deleteMutation.isPending,
    error: (error as Error) || createMutation.error || deleteMutation.error || null,
    createSession,
    deleteSession,
    refreshSession,
  };
}
