import { useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  listExecutionAlertCards,
  pickPrimaryUserAction,
  shouldShowExecutionTepHub,
} from '@/lib/mobile-execution.util';
import type { ExecutionAlertsDto } from '@/types/mobile-execution';
import { ExecutionAlertCard } from './ExecutionNarrativeBlocks';

export interface ExecutionAlertsPanelProps {
  data: ExecutionAlertsDto | null;
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  onReload?: () => void;
  onNavigateToAdjustments?: (interventionId?: string) => void;
  className?: string;
}

export function ExecutionAlertsPanel({
  data,
  loading = false,
  refreshing = false,
  error = null,
  onReload,
  onNavigateToAdjustments,
  className,
}: ExecutionAlertsPanelProps) {
  const [urgentOnly, setUrgentOnly] = useState(false);

  const cards = useMemo(() => {
    const list = data ? listExecutionAlertCards(data) : [];
    if (!urgentOnly) return list;
    return list.filter((a) => a.requiresImmediateAttention);
  }, [data, urgentOnly]);

  if (loading && !data) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={cn('rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm', className)}>
        <p className="text-destructive">{error}</p>
        {onReload ? (
          <Button type="button" variant="outline" size="sm" className="mt-3 h-8" onClick={() => void onReload()}>
            重试
          </Button>
        ) : null}
      </div>
    );
  }

  if (!data) {
    return (
      <p className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        暂无活跃风险提醒
      </p>
    );
  }

  const showRequiredActionCta = shouldShowExecutionTepHub(data.requiredAction);

  return (
    <div className={cn('space-y-4', className)} data-testid="execution-alerts-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {data.requiredAction && data.requiredAction !== 'NONE' ? (
            <Badge variant="outline" className="text-[10px]">
              {data.requiredAction}
            </Badge>
          ) : null}
          {data.banner ? (
            <span className="text-xs text-muted-foreground">{data.banner.title}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={urgentOnly ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setUrgentOnly((v) => !v)}
          >
            仅看紧急
          </Button>
          {onReload ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={refreshing}
              onClick={() => void onReload()}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </Button>
          ) : null}
        </div>
      </div>

      {showRequiredActionCta && onNavigateToAdjustments ? (
        <div className="rounded-lg border border-gate-confirm-border/50 bg-gate-confirm/10 p-3">
          <p className="text-sm font-medium text-foreground">需要您确认调整</p>
          <p className="mt-1 text-xs text-muted-foreground">
            当前行程存在需处理的风险，请前往待调整项完成决策。
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2 h-8 text-xs"
            onClick={() => onNavigateToAdjustments(data.primaryRisk?.decisionProblemIds?.[0])}
          >
            查看待调整项
          </Button>
        </div>
      ) : null}

      {data.primaryRisk ? (
        <ExecutionAlertCard
          alert={data.primaryRisk}
          impacts={data.impacts?.map((i) => ({ id: i.id, label: i.label }))}
          isPrimary
          onPrimaryAction={
            onNavigateToAdjustments
              ? () => {
                  const action = pickPrimaryUserAction(data.primaryRisk?.userActions);
                  const targetId = data.primaryRisk?.decisionProblemIds?.[0];
                  onNavigateToAdjustments(targetId);
                  void action;
                }
              : undefined
          }
        />
      ) : null}

      {cards
        .filter((c) => c.id !== data.primaryRisk?.id)
        .map((alert) => (
          <ExecutionAlertCard
            key={alert.id}
            alert={alert}
            onPrimaryAction={
              onNavigateToAdjustments
                ? () => onNavigateToAdjustments(alert.decisionProblemIds?.[0])
                : undefined
            }
          />
        ))}

      {cards.length === 0 && !data.primaryRisk ? (
        <p className="py-6 text-center text-sm text-muted-foreground">当前无活跃风险</p>
      ) : null}

      {data.aiRecommendation?.headline || data.aiRecommendation?.detail ? (
        <div className="rounded-lg border border-border/60 bg-muted/15 p-3 text-xs">
          <p className="font-medium text-foreground">
            {data.aiRecommendation.headline ?? data.aiRecommendation.title}
          </p>
          <p className="mt-1 text-muted-foreground">{data.aiRecommendation.detail}</p>
        </div>
      ) : null}
    </div>
  );
}
