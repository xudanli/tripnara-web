import { buildGuardianDecisionLogView } from '@/lib/guardian-decision-log-display';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

export { readGuardianDecisionLogMetadata, buildGuardianDecisionLogView } from '@/lib/guardian-decision-log-display';

export interface GuardianTimelineBadgesProps {
  metadata?: unknown;
  className?: string;
}

export function GuardianTimelineBadges({
  metadata,
  className,
}: GuardianTimelineBadgesProps) {
  const view = buildGuardianDecisionLogView({ metadata });
  if (!view) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {view.revalidationLabel ? (
        <Badge variant="outline" className="text-[10px] gap-1 h-5">
          <RefreshCw className="h-3 w-3" />
          {view.revalidationLabel}
        </Badge>
      ) : null}
      {view.leadSpeakerLabel ? (
        <Badge variant="secondary" className="text-[10px] h-5">
          主角 {view.leadSpeakerLabel}
        </Badge>
      ) : null}
      {view.scenarioLabel ? (
        <Badge variant="outline" className="text-[10px] h-5">
          {view.scenarioLabel}
        </Badge>
      ) : null}
      {view.expressionPhaseLabel ? (
        <Badge variant="outline" className="text-[10px] h-5">
          {view.expressionPhaseLabel}
        </Badge>
      ) : null}
      {view.actionsSummary ? (
        <Badge variant="outline" className="text-[10px] h-5 font-normal">
          {view.actionsSummary}
        </Badge>
      ) : null}
    </div>
  );
}
