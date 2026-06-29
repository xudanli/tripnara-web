import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { DecisionCheckerMetricDto } from '@/types/decision-checker';
import { formatIsoDateTimesInDisplayText } from '../workbench-format.util';
import {
  workbenchCard,
  workbenchDecisionCheckerAiBox,
  workbenchDecisionCheckerBadgeClass,
  workbenchDecisionCheckerMetricValueClass,
  workbenchScenarioBorderClass,
} from '../workbench-ui';

/** 决策检查器 BFF 叙述文案：将嵌入的 ISO 时间格式化为可读时间 */
export function formatDecisionCheckerText(
  text: string | undefined | null,
  timezone?: string,
): string {
  return formatIsoDateTimesInDisplayText(text, timezone);
}

export function DecisionCheckerSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(workbenchCard, 'p-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DecisionCheckerBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'danger' | 'success' | 'warning' | 'info' | 'neutral';
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
        workbenchDecisionCheckerBadgeClass(tone),
      )}
    >
      {children}
    </span>
  );
}

export function DecisionCheckerMetricGrid({
  metrics,
  displayTimezone,
}: {
  metrics?: DecisionCheckerMetricDto[];
  displayTimezone?: string;
}) {
  const list = metrics ?? [];
  if (!list.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {list.map((metric) => (
        <div key={`${metric.key}-${metric.label}`} className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">{metric.label}</p>
          <p
            className={cn(
              'mt-0.5 text-sm font-semibold tabular-nums',
              workbenchDecisionCheckerMetricValueClass(metric.tone),
            )}
          >
            {formatDecisionCheckerText(metric.displayValue, displayTimezone)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DecisionCheckerAiBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(workbenchDecisionCheckerAiBox, className)}>{children}</div>;
}

export function DecisionCheckerEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function reliabilityLabel(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    default:
      return '低';
  }
}

export function reliabilityTone(level: 'high' | 'medium' | 'low'): 'success' | 'warning' | 'danger' {
  switch (level) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    default:
      return 'danger';
  }
}

export function impactLevelLabel(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    default:
      return '低';
  }
}

export function scenarioBadgeLabel(badge?: 'recommended' | 'alternative' | 'best'): string | undefined {
  switch (badge) {
    case 'recommended':
      return '推荐';
    case 'alternative':
      return '备选';
    case 'best':
      return '最佳';
    default:
      return undefined;
  }
}

/** @deprecated 使用 workbenchScenarioBorderClass */
export function scenarioBorderClass(variant: 'blue' | 'orange' | 'purple'): string {
  return workbenchScenarioBorderClass(variant);
}
