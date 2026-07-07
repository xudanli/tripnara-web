import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronRight, RefreshCw, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DecisionCheckerEvidenceDto } from '@/types/decision-checker';
import {
  formatDecisionCheckerText,
  DecisionCheckerAiBox,
  DecisionCheckerBadge,
  DecisionCheckerEmpty,
  DecisionCheckerSection,
  reliabilityLabel,
  reliabilityTone,
} from './decision-checker-ui';
import { isPlanObjectEvidenceItem } from '@/lib/decision-checker-evidence-display.util';
import { PlanObjectSourceBadge } from '@/components/planning-workbench/PlanObjectSourceBadge';
import { workbenchDecisionCheckerReliabilityStatClass } from '../workbench-ui';

function formatObservedAt(iso?: string): string | undefined {
  if (!iso) return undefined;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: false, locale: zhCN });
  } catch {
    return undefined;
  }
}

export interface DecisionCheckerEvidenceTabProps {
  model: DecisionCheckerEvidenceDto;
  loading?: boolean;
  unavailable?: boolean;
  error?: string | null;
  displayTimezone?: string;
  /** 无证据时的说明（如工作台按天过滤后为空） */
  emptyMessage?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function DecisionCheckerEvidenceTab({
  model,
  loading,
  unavailable,
  error,
  displayTimezone,
  emptyMessage,
  onRefresh,
  refreshing,
}: DecisionCheckerEvidenceTabProps) {
  const items = model.items ?? [];
  const summary = model.summary ?? { high: 0, medium: 0, low: 0 };

  if (loading) {
    return <DecisionCheckerEmpty>正在加载证据链…</DecisionCheckerEmpty>;
  }

  if (error) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (unavailable) {
    return <DecisionCheckerEmpty>决策检查器接口尚未就绪，暂无证据数据。</DecisionCheckerEmpty>;
  }

  if (!items.length) {
    return (
      <div className="space-y-3">
        <DecisionCheckerEmpty>
          {emptyMessage ??
            '暂无决策证据。完成一次方案生成或可执行性验证后，将在此展示数据来源与可靠性。'}
        </DecisionCheckerEmpty>
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mx-auto flex h-8 w-full max-w-xs text-xs"
            disabled={loading || refreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', refreshing && 'animate-spin')} />
            刷新决策检查器
          </Button>
        ) : null}
      </div>
    );
  }

  const lastUpdatedLabel = formatObservedAt(summary.lastUpdatedAt);

  return (
    <div className="space-y-3">
      <DecisionCheckerSection title="证据列表">
        <div className="space-y-2">
          {items.map((item) => {
            const observedLabel = formatObservedAt(item.observedAt);
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground">{item.title}</p>
                    {isPlanObjectEvidenceItem(item) ? (
                      <PlanObjectSourceBadge compact />
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <DecisionCheckerBadge tone={reliabilityTone(item.reliability)}>
                      {reliabilityLabel(item.reliability)}
                    </DecisionCheckerBadge>
                    {observedLabel ? (
                      <span className="text-[10px] text-muted-foreground">{observedLabel}前</span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {formatDecisionCheckerText(item.subtitle, displayTimezone)}
                </p>
              </div>
            );
          })}
        </div>
      </DecisionCheckerSection>

      <DecisionCheckerSection title="证据可靠性概览">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className={cn('text-lg font-semibold', workbenchDecisionCheckerReliabilityStatClass('high'))}>
              {summary.high}
            </p>
            <p className="text-[10px] text-muted-foreground">高</p>
          </div>
          <div>
            <p className={cn('text-lg font-semibold', workbenchDecisionCheckerReliabilityStatClass('medium'))}>
              {summary.medium}
            </p>
            <p className="text-[10px] text-muted-foreground">中</p>
          </div>
          <div>
            <p className={cn('text-lg font-semibold', workbenchDecisionCheckerReliabilityStatClass('low'))}>
              {summary.low}
            </p>
            <p className="text-[10px] text-muted-foreground">低</p>
          </div>
        </div>
        {lastUpdatedLabel ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            最近更新时间 {lastUpdatedLabel}前
          </p>
        ) : null}
      </DecisionCheckerSection>

      {model.judgmentExplanation ? (
        <DecisionCheckerAiBox>
          <p className="font-medium">系统如何得出冲突判断</p>
          <p className="mt-1 text-muted-foreground">
            {formatDecisionCheckerText(model.judgmentExplanation, displayTimezone)}
          </p>
          {model.calculationDetailUrl ? (
            <a
              href={model.calculationDetailUrl}
              className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-foreground underline-offset-2 hover:underline"
            >
              查看计算明细
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </DecisionCheckerAiBox>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Shield className="h-3 w-3" />
          所有时间均为预计值，实际行程可能受路况与天气影响
        </span>
      </div>
    </div>
  );
}
