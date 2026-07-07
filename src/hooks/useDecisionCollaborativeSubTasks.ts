import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { decisionProblemsApi } from '@/api/decision-problems';
import {
  buildLocalCollaborativeFollowUp,
  decisionCollaborativeSubTaskKindLabel,
  decisionCollaborativeSubTasksQueryKey,
  isCollabSubtaskResolutionMismatchError,
  isLocalCollaborativeFollowUpId,
  type StructuredSuggestedFollowUp,
} from '@/lib/decision-collaborative-sub-task.util';
import { decisionProblemWriteQueryKeys } from '@/lib/decision-resolution.util';
import type {
  CreateDecisionCollaborativeSubTaskRequest,
  DecisionCollaborativeSubTaskKind,
  DecisionCollaborativeSubTaskView,
  PatchDecisionCollaborativeSubTaskRequest,
} from '@/generated/unified-decision-contracts';

export interface UseDecisionCollaborativeSubTasksOptions {
  tripId: string;
  problemId: string | null | undefined;
  resolutionId: string | null | undefined;
  actionPlanId?: string | null;
  enabled?: boolean;
  /** resolution 与后端不一致时刷新 detail */
  onResolutionStale?: () => void | Promise<void>;
}

export function useDecisionCollaborativeSubTasks({
  tripId,
  problemId,
  resolutionId,
  actionPlanId,
  enabled = true,
  onResolutionStale,
}: UseDecisionCollaborativeSubTasksOptions) {
  const queryClient = useQueryClient();
  const [draftKind, setDraftKind] = useState<DecisionCollaborativeSubTaskKind>('CANCELLATION_POLICY');
  const [draftTitle, setDraftTitle] = useState('');
  const [localFollowUps, setLocalFollowUps] = useState<DecisionCollaborativeSubTaskView[]>([]);

  useEffect(() => {
    setLocalFollowUps([]);
  }, [tripId, problemId, resolutionId]);

  const canLoad = enabled && Boolean(tripId && problemId && resolutionId);

  const listQuery = useQuery({
    queryKey: decisionCollaborativeSubTasksQueryKey(tripId, problemId ?? '', resolutionId),
    queryFn: () =>
      decisionProblemsApi.listCollaborativeSubTasks(tripId, problemId!, {
        resolutionId: resolutionId ?? undefined,
      }),
    enabled: canLoad,
    retry: (_failureCount, error) => !isCollabSubtaskResolutionMismatchError(error),
  });

  const handleResolutionStale = useCallback(async () => {
    await onResolutionStale?.();
  }, [onResolutionStale]);

  useEffect(() => {
    if (!listQuery.error || !isCollabSubtaskResolutionMismatchError(listQuery.error)) return;
    void handleResolutionStale();
  }, [listQuery.error, handleResolutionStale]);

  const invalidateRelated = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: decisionCollaborativeSubTasksQueryKey(tripId, problemId ?? '', resolutionId),
      }),
      ...decisionProblemWriteQueryKeys(tripId).map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    ]);
  }, [queryClient, tripId, problemId, resolutionId]);

  const createMutation = useMutation({
    mutationFn: (body: CreateDecisionCollaborativeSubTaskRequest) =>
      decisionProblemsApi.createCollaborativeSubTask(tripId, problemId!, body),
    onSuccess: async () => {
      toast.success('协作跟进子任务已创建');
      setDraftTitle('');
      await invalidateRelated();
    },
    onError: async (err: Error) => {
      if (isCollabSubtaskResolutionMismatchError(err)) {
        return;
      }
      toast.error(err.message || '创建子任务失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      subTaskId,
      body,
    }: {
      subTaskId: string;
      body: PatchDecisionCollaborativeSubTaskRequest;
    }) => decisionProblemsApi.patchCollaborativeSubTask(tripId, problemId!, subTaskId, body),
    onSuccess: async () => {
      toast.success('子任务已更新');
      await invalidateRelated();
    },
    onError: (err: Error) => {
      toast.error(err.message || '更新子任务失败');
    },
  });

  const addLocalFollowUp = useCallback(
    (input: { title: string; kind: DecisionCollaborativeSubTaskKind; description?: string }) => {
      if (!resolutionId) return null;
      const normalizedTitle = input.title.trim();
      if (!normalizedTitle) return null;

      const duplicate = [...localFollowUps, ...(listQuery.data?.items ?? [])].some(
        (item) => item.title.trim() === normalizedTitle && item.status !== 'cancelled',
      );
      if (duplicate) {
        toast.message('该跟进项已存在');
        return null;
      }

      const local = buildLocalCollaborativeFollowUp({
        resolutionId,
        title: normalizedTitle,
        kind: input.kind,
        description: input.description,
      });
      setLocalFollowUps((prev) => [...prev, local]);
      return local;
    },
    [resolutionId, localFollowUps, listQuery.data?.items],
  );

  const createSubTask = useCallback(
    async (input?: Partial<CreateDecisionCollaborativeSubTaskRequest>) => {
      if (!problemId) {
        toast.error('请先选择决策问题');
        return null;
      }

      const kind = input?.kind ?? draftKind;
      const title =
        input?.title?.trim() ||
        draftTitle.trim() ||
        decisionCollaborativeSubTaskKindLabel(kind);

      if (!title) {
        toast.error('请填写子任务标题');
        return null;
      }

      const body: CreateDecisionCollaborativeSubTaskRequest = {
        title,
        kind,
        description: input?.description,
        assigneeUserId: input?.assigneeUserId,
        actionPlanId: input?.actionPlanId ?? actionPlanId ?? undefined,
      };
      if (input?.resolutionId?.trim()) {
        body.resolutionId = input.resolutionId.trim();
      }

      try {
        const created = await createMutation.mutateAsync(body);
        setDraftTitle('');
        return created;
      } catch (err) {
        if (!isCollabSubtaskResolutionMismatchError(err)) throw err;

        if (!resolutionId) {
          toast.error(err instanceof Error ? err.message : '创建子任务失败');
          return null;
        }

        const local = addLocalFollowUp({
          title,
          kind,
          description: input?.description,
        });
        if (local) {
          setDraftTitle('');
          toast.success('跟进任务已添加', {
            description: '后端协作 API 暂不可用，已在本地记录；不影响应用到行程。',
          });
          return { subTask: local };
        }
        return null;
      }
    },
    [
      problemId,
      resolutionId,
      actionPlanId,
      draftKind,
      draftTitle,
      createMutation,
      addLocalFollowUp,
    ],
  );

  const updateSubTask = useCallback(
    async (subTaskId: string, body: PatchDecisionCollaborativeSubTaskRequest) => {
      if (isLocalCollaborativeFollowUpId(subTaskId)) {
        let updated: DecisionCollaborativeSubTaskView | undefined;
        setLocalFollowUps((prev) =>
          prev.map((item) => {
            if (item.id !== subTaskId) return item;
            updated = {
              ...item,
              ...(body.status ? { status: body.status } : {}),
              ...(body.assigneeUserId !== undefined
                ? { assigneeUserId: body.assigneeUserId }
                : {}),
              ...(body.title ? { title: body.title } : {}),
              ...(body.description ? { description: body.description } : {}),
            };
            return updated;
          }),
        );
        return updated ? { subTask: updated } : null;
      }
      if (!problemId) return null;
      return updateMutation.mutateAsync({ subTaskId, body });
    },
    [problemId, updateMutation],
  );

  const markSubTaskDone = useCallback(
    async (subTaskId: string) => updateSubTask(subTaskId, { status: 'completed' }),
    [updateSubTask],
  );

  const cancelSubTask = useCallback(
    async (subTaskId: string) => updateSubTask(subTaskId, { status: 'cancelled' }),
    [updateSubTask],
  );

  const items: DecisionCollaborativeSubTaskView[] = useMemo(() => {
    const remote = listQuery.data?.items ?? [];
    const remoteTitles = new Set(remote.map((item) => item.title.trim()));
    const locals = localFollowUps.filter((item) => !remoteTitles.has(item.title.trim()));
    return [...remote, ...locals];
  }, [listQuery.data?.items, localFollowUps]);

  return {
    items,
    localFollowUpIds: localFollowUps.map((item) => item.id),
    addLocalFollowUp,
    loading: listQuery.isLoading,
    creating: createMutation.isPending,
    updatingSubTaskId: updateMutation.isPending
      ? (updateMutation.variables?.subTaskId ?? null)
      : null,
    draftKind,
    draftTitle,
    setDraftKind,
    setDraftTitle,
    createSubTask,
    updateSubTask,
    markSubTaskDone,
    cancelSubTask,
    reload: listQuery.refetch,
  };
}

export type UseDecisionCollaborativeSubTasksResult = ReturnType<
  typeof useDecisionCollaborativeSubTasks
>;
