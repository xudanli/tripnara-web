import { useEffect, useMemo, useState } from 'react';
import { readinessApi, type EnhancedRisk } from '@/api/readiness';
import {
  countTaskProgress,
  createManualTask,
  loadPreparationTasks,
  resolveTaskMembers,
  savePreparationTasks,
  syncTasksFromRisks,
  updateTask,
  addManualTask,
  deleteTask,
  type ReadinessPreparationTask,
  type ReadinessTaskScope,
} from '@/lib/readiness-preparation-tasks';
import type { TaskFormValues } from '@/components/readiness/ReadinessTaskFormDialog';
import { countMitigationProgress, loadRiskMitigationChecked } from '@/lib/risk-mitigation-progress';

function collectRisks(
  riskWarnings: Awaited<ReturnType<typeof readinessApi.getRiskWarnings>> | null,
  readinessRisks?: EnhancedRisk[],
  findingRisks?: EnhancedRisk[],
): EnhancedRisk[] {
  if (riskWarnings != null) {
    return [...(riskWarnings.risks ?? [])];
  }
  const risks: EnhancedRisk[] = [];
  if (readinessRisks?.length) risks.push(...readinessRisks);
  if (findingRisks?.length) risks.push(...findingRisks);
  return risks;
}

export function useReadinessPreparationTasks(
  tripId: string | null | undefined,
  options?: {
    enabled?: boolean;
    viewer?: { id: string; name?: string | null } | null;
    isZh?: boolean;
  },
) {
  const enabled = options?.enabled !== false && !!tripId;
  const isZh = options?.isZh ?? true;
  const viewerId = options?.viewer?.id;
  const viewerName = options?.viewer?.name ?? null;

  const [preparationTasks, setPreparationTasks] = useState<ReadinessPreparationTask[]>(() =>
    tripId ? loadPreparationTasks(tripId) : [],
  );
  const [allRisks, setAllRisks] = useState<EnhancedRisk[]>([]);
  const [loading, setLoading] = useState(() => enabled);

  const taskMembers = useMemo(
    () =>
      resolveTaskMembers(
        tripId || '',
        viewerId ? { id: viewerId, name: viewerName } : null,
      ),
    [tripId, viewerId, viewerName],
  );

  useEffect(() => {
    if (!enabled || !tripId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [riskWarnings, readiness] = await Promise.all([
          readinessApi.getRiskWarnings(tripId, { lang: isZh ? 'zh' : 'en' }).catch(() => null),
          readinessApi.getTripReadiness(tripId).catch(() => null),
        ]);

        const findingRisks: EnhancedRisk[] = [];
        readiness?.findings?.forEach((finding) => {
          if (finding.risks?.length) findingRisks.push(...(finding.risks as EnhancedRisk[]));
        });

        const risks = collectRisks(
          riskWarnings,
          readiness?.risks as EnhancedRisk[] | undefined,
          findingRisks,
        );

        if (cancelled) return;
        setAllRisks(risks);

        const members = resolveTaskMembers(
          tripId,
          viewerId ? { id: viewerId, name: viewerName } : null,
        );
        const stored = loadPreparationTasks(tripId);
        const legacyChecked = loadRiskMitigationChecked(tripId);
        const synced = syncTasksFromRisks(risks, stored, isZh, members, legacyChecked);
        setPreparationTasks(synced);
        savePreparationTasks(tripId, synced);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, tripId, isZh, viewerId, viewerName]);

  const preparationTasksById = useMemo(
    () => new Map(preparationTasks.map((task) => [task.id, task])),
    [preparationTasks],
  );

  const taskProgress = useMemo(() => countTaskProgress(preparationTasks), [preparationTasks]);

  const riskMitigationProgress = useMemo(() => {
    const checked = new Set(preparationTasks.filter((t) => t.completed).map((t) => t.id));
    return countMitigationProgress(allRisks, checked);
  }, [allRisks, preparationTasks]);

  const persistPreparationTasks = (next: ReadinessPreparationTask[]) => {
    if (!tripId) return;
    setPreparationTasks(next);
    savePreparationTasks(tripId, next);
  };

  const handleToggleTask = (taskId: string, completed: boolean) => {
    persistPreparationTasks(updateTask(preparationTasks, taskId, { completed }));
  };

  const handleAssignTask = (taskId: string, userId: string | null, label: string | null) => {
    persistPreparationTasks(
      updateTask(preparationTasks, taskId, { assigneeUserId: userId, assigneeLabel: label }),
    );
  };

  const handleChangeTaskScope = (taskId: string, scope: ReadinessTaskScope) => {
    const patch: Partial<
      Pick<ReadinessPreparationTask, 'scope' | 'assigneeUserId' | 'assigneeLabel'>
    > = { scope };
    if (scope === 'personal' && taskMembers[0]) {
      patch.assigneeUserId = taskMembers[0].userId;
      patch.assigneeLabel = taskMembers[0].displayName;
    }
    if (scope === 'team') {
      patch.assigneeUserId = null;
      patch.assigneeLabel = null;
    }
    persistPreparationTasks(updateTask(preparationTasks, taskId, patch));
  };

  const handleCreateTask = (values: TaskFormValues) => {
    const task = createManualTask(values, taskMembers);
    persistPreparationTasks(addManualTask(preparationTasks, task));
  };

  const handleUpdateTask = (taskId: string, values: TaskFormValues) => {
    persistPreparationTasks(
      updateTask(preparationTasks, taskId, {
        title: values.title,
        scope: values.scope,
        priority: values.priority,
        category: values.category,
        assigneeUserId: values.assigneeUserId,
        assigneeLabel: values.assigneeLabel,
        userEdited: true,
      }),
    );
  };

  const handleDeleteTask = (taskId: string) => {
    persistPreparationTasks(deleteTask(preparationTasks, taskId));
  };

  return {
    loading,
    allRisks,
    preparationTasks,
    preparationTasksById,
    taskMembers,
    taskProgress,
    riskMitigationProgress,
    handleToggleTask,
    handleAssignTask,
    handleChangeTaskScope,
    handleCreateTask,
    handleUpdateTask,
    handleDeleteTask,
  };
}
