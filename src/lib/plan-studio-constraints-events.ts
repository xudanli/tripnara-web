import type {
  ConstraintPendingItem,
  ConstraintPendingKey,
  PlanStudioConstraintsChangeSource,
} from '@/types/planning-constraints';

export const PLAN_STUDIO_CONSTRAINTS_CHANGED = 'plan-studio:constraints-changed';

export const PLAN_STUDIO_OPEN_CONSTRAINT_EDITOR = 'plan-studio:open-constraint-editor';

export interface PlanStudioOpenConstraintEditorDetail {
  tripId?: string;
  key?: ConstraintPendingKey;
  item?: ConstraintPendingItem;
  /** 从方案预览抽屉跳转时关闭 Plan Gate */
  closePlanGate?: boolean;
  /** 约束保存/确认后提示重新打开方案预览并生成 */
  resumePlanGate?: boolean;
}

export function dispatchOpenConstraintEditor(
  detail: PlanStudioOpenConstraintEditorDetail = {},
): void {
  window.dispatchEvent(
    new CustomEvent<PlanStudioOpenConstraintEditorDetail>(PLAN_STUDIO_OPEN_CONSTRAINT_EDITOR, {
      detail,
    }),
  );
}

export interface PlanStudioConstraintsChangedDetail {
  tripId: string;
  source: PlanStudioConstraintsChangeSource;
}

export const PLAN_STUDIO_CONSTRAINT_LIST_ITEM_PATCH = 'plan-studio:constraint-list-item-patch';

export interface PlanStudioConstraintListItemPatchDetail {
  tripId: string;
  itemId: string;
  patch: Partial<import('@/components/plan-studio/workbench/constraint-console-types').ConstraintListEntry>;
}

export function dispatchConstraintListItemPatch(
  tripId: string,
  itemId: string,
  patch: PlanStudioConstraintListItemPatchDetail['patch'],
): void {
  window.dispatchEvent(
    new CustomEvent<PlanStudioConstraintListItemPatchDetail>(PLAN_STUDIO_CONSTRAINT_LIST_ITEM_PATCH, {
      detail: { tripId, itemId, patch },
    }),
  );
}

export function subscribeConstraintListItemPatch(
  handler: (detail: PlanStudioConstraintListItemPatchDetail) => void,
): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<PlanStudioConstraintListItemPatchDetail>).detail;
    if (!detail?.tripId || !detail.itemId) return;
    handler(detail);
  };
  window.addEventListener(PLAN_STUDIO_CONSTRAINT_LIST_ITEM_PATCH, listener);
  return () => window.removeEventListener(PLAN_STUDIO_CONSTRAINT_LIST_ITEM_PATCH, listener);
}

export function dispatchPlanStudioConstraintsChanged(
  tripId: string,
  source: PlanStudioConstraintsChangeSource,
): void {
  window.dispatchEvent(
    new CustomEvent<PlanStudioConstraintsChangedDetail>(PLAN_STUDIO_CONSTRAINTS_CHANGED, {
      detail: { tripId, source },
    }),
  );
}

export function subscribePlanStudioConstraintsChanged(
  handler: (detail: PlanStudioConstraintsChangedDetail) => void,
): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<PlanStudioConstraintsChangedDetail>).detail;
    if (!detail?.tripId) return;
    handler(detail);
  };
  window.addEventListener(PLAN_STUDIO_CONSTRAINTS_CHANGED, listener);
  return () => window.removeEventListener(PLAN_STUDIO_CONSTRAINTS_CHANGED, listener);
}

/** debounce 约束变更 → revalidate（P1-C） */
export function subscribeDebouncedConstraintsRevalidate(input: {
  tripId: string | null | undefined;
  revalidate: () => Promise<void>;
  debounceMs?: number;
}): () => void {
  const { tripId, revalidate, debounceMs = 2000 } = input;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return subscribePlanStudioConstraintsChanged((detail) => {
    if (!tripId || detail.tripId !== tripId) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void revalidate();
    }, debounceMs);
  });
}
