import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TRIP_DETAIL_TERMS } from '@/lib/trip-detail-terminology.util';
import { tripDetailUi } from '@/components/trips/detail/trip-detail-ui';

interface TripSurfaceQuickLinksProps {
  openDecisionCount: number;
  suggestedConfirmCount: number;
  monitoringCount: number;
  onOpenDecisions?: () => void;
  onOpenMonitoring?: () => void;
  className?: string;
}

/** 概览 Tab 快捷入口 — 滚动至待办 / 监控区块 */
export function TripSurfaceQuickLinks({
  openDecisionCount,
  suggestedConfirmCount,
  monitoringCount,
  onOpenDecisions,
  onOpenMonitoring,
  className,
}: TripSurfaceQuickLinksProps) {
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      <SurfaceLinkCard
        title={TRIP_DETAIL_TERMS.openDecision.short}
        description={
          openDecisionCount > 0
            ? `${openDecisionCount} 项待你决定${suggestedConfirmCount > 0 ? ` · ${suggestedConfirmCount} 项建议确认` : ''}`
            : suggestedConfirmCount > 0
              ? `${suggestedConfirmCount} 项建议确认`
              : '暂无待拍板事项'
        }
        emphasis={openDecisionCount > 0 || suggestedConfirmCount > 0}
        onClick={onOpenDecisions}
      />
      <SurfaceLinkCard
        title={TRIP_DETAIL_TERMS.monitoringAlert.short}
        description={
          monitoringCount > 0
            ? `${monitoringCount} 项持续监控中`
            : '天气、路况等自动跟踪'
        }
        emphasis={monitoringCount > 0}
        onClick={onOpenMonitoring}
      />
    </div>
  );
}

function SurfaceLinkCard({
  title,
  description,
  emphasis,
  onClick,
}: {
  title: string;
  description: string;
  emphasis?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        tripDetailUi.card,
        'flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/20',
        emphasis && 'border-gate-confirm-border/40',
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
