import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  resolveLoopProgressLabel,
  resolveLoopValidationPresentation,
} from '@/lib/trip-loop-display';
import type { TripLoopUiPhase, TripLoopUiView } from '@/types/trip-loop';

interface LoopProgressHeaderProps {
  ui: TripLoopUiView;
  loading?: boolean;
  className?: string;
}

function phaseBadgeVariant(
  phase: TripLoopUiPhase,
  completedTone: 'success' | 'caution',
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (phase) {
    case 'completed':
      return completedTone === 'caution' ? 'secondary' : 'default';
    case 'failed':
      return 'destructive';
    case 'awaiting_approval':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function LoopProgressHeader({ ui, loading, className }: LoopProgressHeaderProps) {
  const presentation = resolveLoopValidationPresentation(ui);
  const pct =
    ui.progress.totalChecks > 0
      ? Math.round((ui.progress.completedChecks / ui.progress.totalChecks) * 100)
      : ui.phase === 'completed'
        ? 100
        : 0;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            {loading || ui.phase === 'validating' ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" aria-hidden />
            ) : null}
            <h2 className="text-base font-semibold tracking-tight">{presentation.headline}</h2>
          </div>
          {presentation.subheadline ? (
            <p className="text-sm text-muted-foreground">{presentation.subheadline}</p>
          ) : null}
        </div>
        <Badge variant={phaseBadgeVariant(ui.phase, presentation.completedTone)} className="shrink-0">
          {presentation.phaseLabel}
        </Badge>
      </div>
      {ui.progress.totalChecks > 0 ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{resolveLoopProgressLabel(ui)}</span>
            <span>
              {ui.progress.completedChecks}/{ui.progress.totalChecks}
            </span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      ) : null}
    </div>
  );
}
