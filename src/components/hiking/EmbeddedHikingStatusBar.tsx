import { useNavigate } from 'react-router-dom';
import { Mountain, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HikePlanRecord } from '@/types/hike-plan';
import type { HikingPhase } from '@/types/hiking-embedded';
import { HIKING_PHASE_LABELS } from '@/lib/hiking-phase';

type Props = {
  tripId: string;
  phase: HikingPhase;
  segmentCount: number;
  phaseHintZh?: string;
  plans?: HikePlanRecord[];
  onAddSegment?: () => void;
};

function primaryCta(
  phase: HikingPhase,
  plans: HikePlanRecord[],
  tripId: string,
  onAddSegment?: () => void
): { label: string; action: () => void } | null {
  const inProgress = plans.find((p) => p.status === 'in_progress');
  if (phase === 'on_trail' && inProgress) {
    return {
      label: '继续行中徒步',
      action: () => navigate(`/dashboard/trails/on-trail/${inProgress.id}`),
    };
  }
  if (phase === 'configure_segments' || phase === 'link_plans') {
    return onAddSegment
      ? { label: phase === 'link_plans' ? '补全片段关联' : '添加徒步片段', action: onAddSegment }
      : null;
  }
  const prep = plans.find((p) => p.status === 'planning' || p.status === 'ready');
  if (phase === 'prep' && prep) {
    return {
      label: '行前准备',
      action: () => navigate(`/dashboard/trails/prep/${prep.id}`),
    };
  }
  if (phase === 'wrap_up') {
    const done = plans.find((p) => p.status === 'completed');
    if (done) {
      return {
        label: '查看复盘',
        action: () => navigate(`/dashboard/trails/review/${done.id}`),
      };
    }
  }
  return null;
}

export function EmbeddedHikingStatusBar({
  tripId,
  phase,
  segmentCount,
  phaseHintZh,
  plans = [],
  onAddSegment,
}: Props) {
  const navigate = useNavigate();
  const cta = primaryCta(phase, plans, tripId, onAddSegment);

  return (
    <div className="rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Mountain className="h-5 w-5 text-emerald-700 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-950">
            混合出行 · {segmentCount > 0 ? `${segmentCount} 段徒步` : '待登记片段'}
          </p>
          <p className="text-xs text-emerald-800/80 mt-0.5">
            {phaseHintZh ?? `当前阶段：${HIKING_PHASE_LABELS[phase]}`}
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-300 text-emerald-900 text-xs shrink-0">
          {HIKING_PHASE_LABELS[phase]}
        </Badge>
      </div>
      {cta ? (
        <Button
          type="button"
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800"
          onClick={() => cta.action()}
        >
          {cta.label}
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      ) : null}
    </div>
  );
}
