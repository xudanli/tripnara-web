import { cn } from '@/lib/utils';
import { useTripTravelContext } from '../context/TripTravelContext';
import { PlanContentStateBadge } from './PlanContentStateBadge';
import { resolvePlanLayerStates } from '../lib/plan-content-state.util';

interface PlanStudioPlanLayersStripProps {
  hasWorkbenchDraft?: boolean;
  hasItineraryAdjustPreview?: boolean;
  className?: string;
}

/** Plan Studio — 展示当前生效 / 建议 / 草案层（TC plan view 投影） */
export function PlanStudioPlanLayersStrip({
  hasWorkbenchDraft = false,
  hasItineraryAdjustPreview = false,
  className,
}: PlanStudioPlanLayersStripProps) {
  const { enabled, ready, planView, overviewView } = useTripTravelContext();

  if (!enabled || !ready) return null;

  const layers = resolvePlanLayerStates({
    planView,
    overviewView,
    hasWorkbenchDraft,
    hasItineraryAdjustPreview,
  });

  if (layers.length <= 1 && !overviewView?.pendingProposalCount) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-2',
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        计划层
      </span>
      {layers.map((state) => (
        <PlanContentStateBadge key={state} state={state} />
      ))}
      {planView?.effectivePlan?.headline ? (
        <span className="text-xs text-muted-foreground truncate max-w-[240px]">
          {planView.effectivePlan.headline}
        </span>
      ) : null}
    </div>
  );
}
