import type { PlanStudioConstraintsChangeSource } from '@/types/planning-constraints';

export const PLAN_STUDIO_CONSTRAINTS_CHANGED = 'plan-studio:constraints-changed';

export interface PlanStudioConstraintsChangedDetail {
  tripId: string;
  source: PlanStudioConstraintsChangeSource;
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
