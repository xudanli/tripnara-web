import type { ReactNode } from 'react';
import { CloudRain, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { inTripLoopPhaseLabel } from '@/lib/trip-loop.adapter';
import type { InTripLoopUiView } from '@/types/trip-loop';
import { Badge } from '@/components/ui/badge';
import { LoopIssueCardView } from './LoopIssueCard';

export interface InTripRecoveryLoopPanelProps {
  ui: InTripLoopUiView | null;
  loading?: boolean;
  applying?: boolean;
  error?: string | null;
  canApply?: boolean;
  onApply?: () => void;
  className?: string;
}

function LayerBlock({
  icon,
  title,
  body,
  accent,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  accent?: string;
}) {
  if (!body) return null;
  return (
    <div className={cn('rounded-lg border px-3 py-3 space-y-1', accent)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <p className="text-sm leading-relaxed">{body}</p>
    </div>
  );
}

export function InTripRecoveryLoopPanel({
  ui,
  loading,
  applying,
  error,
  canApply,
  onApply,
  className,
}: InTripRecoveryLoopPanelProps) {
  if (loading && !ui) {
    return (
      <Card className={className}>
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!ui || ui.phase === 'monitoring') {
    return null;
  }

  const primaryLabel = ui.primaryAction?.label ?? '采用调整';

  return (
    <Card className={cn('border-l-4 border-l-border', className)}>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold">{ui.headline}</h2>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {inTripLoopPhaseLabel(ui.phase)}
          </Badge>
        </div>
        {ui.subheadline ? (
          <p className="text-sm text-muted-foreground">{ui.subheadline}</p>
        ) : null}

        <div className="space-y-2">
          <LayerBlock
            icon={<CloudRain className="h-3.5 w-3.5" aria-hidden />}
            title="发生了什么"
            body={ui.layers.happened}
            accent="bg-amber-50/80 border-amber-200/80"
          />
          <LayerBlock
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden />}
            title="会影响什么"
            body={ui.layers.impact}
            accent="bg-orange-50/60 border-orange-200/60"
          />
          <LayerBlock
            icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
            title="建议怎么做"
            body={ui.layers.action}
            accent="bg-muted/20 border-border/80"
          />
        </div>

        {ui.issueCards.length > 0 ? (
          <div className="space-y-2">
            {ui.issueCards.map((issue) => (
              <LoopIssueCardView
                key={issue.environmentEventId ?? issue.issueId}
                issue={issue}
              />
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {canApply && onApply ? (
          <Button className="w-full sm:w-auto" onClick={onApply} disabled={applying}>
            {applying ? '应用中…' : primaryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
