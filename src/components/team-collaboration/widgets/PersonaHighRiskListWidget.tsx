import { ChevronRight } from 'lucide-react';
import { frictionPointTitle } from '@/lib/collab-friction-domains';
import type { HighRiskAlert } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface PersonaHighRiskListWidgetProps {
  alerts: HighRiskAlert[];
  onAlertClick?: (alert: HighRiskAlert) => void;
  className?: string;
}

const LEVEL_DOT: Record<HighRiskAlert['level'], string> = {
  red: 'bg-rose-500',
  yellow: 'bg-amber-500',
  green: 'bg-emerald-500',
};

export function PersonaHighRiskListWidget({
  alerts,
  onAlertClick,
  className,
}: PersonaHighRiskListWidgetProps) {
  return (
    <CollabWidgetCard title="高风险摩擦点" compact className={className}>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无高风险摩擦点。</p>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <li key={alert.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md border border-border/60 px-2.5 py-2 text-left transition-colors hover:bg-muted/30"
                onClick={() => onAlertClick?.(alert)}
              >
                <span
                  className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', LEVEL_DOT[alert.level])}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">{frictionPointTitle(alert)}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                    {alert.summary}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                    去协作决策
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </CollabWidgetCard>
  );
}
