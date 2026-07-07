import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  frictionImpactDimension,
  frictionPointTitle,
} from '@/lib/collab-friction-domains';
import {
  workbenchListItemIdle,
  workbenchSoftPriorityClass,
} from '@/components/plan-studio/workbench/workbench-ui';
import type { HighRiskAlert } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface HighRiskAlertsWidgetProps {
  alerts: HighRiskAlert[];
  onAlertClick?: (alert: HighRiskAlert) => void;
}

function severityLabel(level: HighRiskAlert['level']): '高' | '中' | '低' {
  if (level === 'red') return '高';
  if (level === 'yellow') return '中';
  return '低';
}

export function HighRiskAlertsWidget({ alerts, onAlertClick }: HighRiskAlertsWidgetProps) {
  return (
    <CollabWidgetCard title="潜在摩擦点与建议">
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无高风险摩擦点。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="w-8 pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">摩擦点</th>
                <th className="pb-2 pr-3 font-medium">严重度</th>
                <th className="pb-2 pr-3 font-medium">影响维度</th>
                <th className="pb-2 pr-3 font-medium">表现</th>
                <th className="pb-2 pr-3 font-medium">建议缓解方案</th>
                <th className="w-6 pb-2 font-medium" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, index) => (
                <tr key={alert.id} className="border-b border-border/40 last:border-0">
                  <td colSpan={7} className="p-0">
                    <button
                      type="button"
                      className={cn(
                        'grid min-h-[40px] w-full grid-cols-[24px_minmax(72px,12%)_minmax(48px,8%)_minmax(64px,10%)_1fr_minmax(96px,18%)_20px] items-start gap-x-2 text-left transition-colors',
                        workbenchListItemIdle,
                        'border-0 px-2 py-2 hover:bg-muted/40',
                      )}
                      onClick={() => onAlertClick?.(alert)}
                    >
                      <span className="py-0.5 tabular-nums text-muted-foreground">{index + 1}</span>
                      <span className="py-0.5 font-medium text-foreground">
                        {frictionPointTitle(alert)}
                      </span>
                      <span className="py-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-normal',
                            workbenchSoftPriorityClass(severityLabel(alert.level)),
                          )}
                        >
                          {severityLabel(alert.level)}
                        </Badge>
                      </span>
                      <span className="py-0.5 text-muted-foreground">
                        {frictionImpactDimension(alert)}
                      </span>
                      <span className="py-0.5 text-muted-foreground">{alert.summary}</span>
                      <span className="py-0.5 text-muted-foreground">
                        {alert.recommendedStrategy}
                      </span>
                      <span className="flex items-center justify-end self-center text-muted-foreground/60">
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollabWidgetCard>
  );
}
