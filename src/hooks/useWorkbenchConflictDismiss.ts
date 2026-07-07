import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  conflictsForWorkbenchDay,
  dismissWorkbenchConflicts,
  filterVisibleWorkbenchConflicts,
  isWorkbenchConflictDeferrable,
  isWorkbenchConflictDismissed,
  undoDismissWorkbenchConflict,
} from '@/lib/workbench-conflict-dismiss.util';
import { trackWorkbenchConflictDefer, trackWorkbenchConflictDeferUndo } from '@/utils/plan-studio-workbench-analytics';

export interface UseWorkbenchConflictDismissResult {
  visibleItems: PlanningConflictItem[];
  isDismissed: (conflict: Pick<PlanningConflictItem, 'id' | 'semanticKey'>) => boolean;
  deferConflictsForDay: (dayIndex: number, items: PlanningConflictItem[]) => void;
  restoreConflict: (conflictId: string) => void;
  canDeferDay: (dayIndex: number, items: PlanningConflictItem[]) => boolean;
}

export function useWorkbenchConflictDismiss(
  tripId: string | undefined,
  items: PlanningConflictItem[],
): UseWorkbenchConflictDismissResult {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!tripId) return;
    setRevision((value) => value + 1);
  }, [tripId, items]);

  const visibleItems = useMemo(() => {
    if (!tripId) return items;
    void revision;
    return filterVisibleWorkbenchConflicts(tripId, items);
  }, [tripId, items, revision]);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const isDismissed = useCallback(
    (conflict: Pick<PlanningConflictItem, 'id' | 'semanticKey'>) => {
      if (!tripId) return false;
      void revision;
      return isWorkbenchConflictDismissed(tripId, conflict);
    },
    [tripId, revision],
  );

  const canDeferDay = useCallback(
    (dayIndex: number, sourceItems: PlanningConflictItem[]) => {
      const dayItems = conflictsForWorkbenchDay(sourceItems, dayIndex);
      if (dayItems.some((item) => item.priority === 'must_handle')) return false;
      return dayItems.some(isWorkbenchConflictDeferrable);
    },
    [],
  );

  const deferConflictsForDay = useCallback(
    (dayIndex: number, sourceItems: PlanningConflictItem[]) => {
      if (!tripId) return;

      const dayItems = conflictsForWorkbenchDay(sourceItems, dayIndex);
      if (dayItems.some((item) => item.priority === 'must_handle')) {
        toast.message('阻断级问题需修复或进入决策空间确认');
        return;
      }

      const added = dismissWorkbenchConflicts(tripId, dayItems, dayIndex);
      if (!added.length) {
        toast.message('当前没有可稍后处理的冲突');
        return;
      }

      bump();
      trackWorkbenchConflictDefer({
        tripId,
        dayIndex,
        conflictIds: added.map((entry) => entry.conflictId),
        priority: 'suggest_adjust',
      });

      const undoIds = added.map((entry) => entry.conflictId);
      toast.message('已移入稍后处理', {
        description: '仅在本行程视图中隐藏，刷新评估后若问题仍在会重新提示。',
        action: {
          label: '撤销',
          onClick: () => {
            for (const id of undoIds) {
              undoDismissWorkbenchConflict(tripId, id);
              trackWorkbenchConflictDeferUndo({ tripId, conflictId: id, within5s: true });
            }
            bump();
          },
        },
      });
    },
    [tripId, bump],
  );

  const restoreConflict = useCallback(
    (conflictId: string) => {
      if (!tripId) return;
      undoDismissWorkbenchConflict(tripId, conflictId);
      trackWorkbenchConflictDeferUndo({ tripId, conflictId, within5s: false });
      bump();
    },
    [tripId, bump],
  );

  return {
    visibleItems,
    isDismissed,
    deferConflictsForDay,
    restoreConflict,
    canDeferDay,
  };
}
