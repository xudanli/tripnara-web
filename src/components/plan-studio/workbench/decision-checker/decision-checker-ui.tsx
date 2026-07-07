import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type {
  DecisionCheckerEvidenceItemDto,
  DecisionCheckerMetricDto,
} from '@/types/decision-checker';
import { formatIsoDateTimesInDisplayText } from '../workbench-format.util';
import {
  workbenchCard,
  workbenchDecisionCheckerAiBox,
  workbenchDecisionCheckerBadgeClass,
  workbenchDecisionCheckerMetricValueClass,
  workbenchLinkClass,
  workbenchScenarioBorderClass,
} from '../workbench-ui';
import type { DecisionCheckerImpactPreviewRow } from '@/lib/decision-checker-overview.util';
import { resolveEvidenceKindIcon } from '@/lib/decision-checker-overview.util';

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
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
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
  compact = false,
}: {
  metrics?: DecisionCheckerMetricDto[];
  displayTimezone?: string;
  /** 侧栏等窄容器 — 单列/双列布局，避免 3 列挤压换行 */
  compact?: boolean;
}) {
  const list = metrics ?? [];
  if (!list.length) return null;

  const gridClass =
    list.length === 1
      ? 'grid-cols-1'
      : list.length === 2
        ? 'grid-cols-2'
        : compact
          ? 'grid-cols-2'
          : 'grid-cols-3';

  return (
    <div className={cn('grid gap-1.5', gridClass)}>
      {list.map((metric) => (
        <div
          key={`${metric.key}-${metric.label}`}
          className={cn(
            'min-w-0 rounded-md border border-border/60 bg-muted/20',
            compact ? 'px-2 py-1' : 'rounded-lg px-2 py-1.5',
            list.length === 1 && compact && 'flex items-baseline justify-between gap-2',
          )}
        >
          <p className="shrink-0 text-[10px] text-muted-foreground">{metric.label}</p>
          <p
            className={cn(
              'min-w-0 font-semibold tabular-nums leading-snug',
              compact ? 'text-xs' : 'mt-0.5 text-sm',
              list.length === 1 && compact && 'text-right',
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

/** 设计稿 · 当前推荐下的横向指标条 */
export function DecisionCheckerMetricStrip({
  metrics,
  displayTimezone,
  className,
}: {
  metrics?: DecisionCheckerMetricDto[];
  displayTimezone?: string;
  className?: string;
}) {
  const list = metrics ?? [];
  if (!list.length) return null;

  return (
    <div
      className={cn(
        'flex divide-x divide-border/60 overflow-hidden rounded-lg border border-border/50 bg-muted/10',
        className,
      )}
    >
      {list.map((metric) => (
        <div
          key={`${metric.key}-${metric.label}`}
          className="flex min-w-0 flex-1 flex-col items-center px-1.5 py-2.5 text-center sm:px-2"
        >
          <p className="text-[10px] leading-tight text-muted-foreground">{metric.label}</p>
          <p
            className={cn(
              'mt-1 text-sm font-semibold tabular-nums leading-none',
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

export function DecisionCheckerEvidencePreview({
  items,
  displayTimezone,
  onViewAll,
  className,
}: {
  items?: DecisionCheckerEvidenceItemDto[];
  displayTimezone?: string;
  onViewAll?: () => void;
  className?: string;
}) {
  const list = items ?? [];
  if (!list.length) return null;
  const preview = list.slice(0, 4);

  return (
    <section className={cn(workbenchCard, 'p-3', className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-foreground">支持证据</h3>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
          >
            查看全部 ({list.length})
            <span aria-hidden>›</span>
          </button>
        ) : null}
      </div>
      <ul className="space-y-2.5">
        {preview.map((item) => {
          const Icon = resolveEvidenceKindIcon(item.kind);
          return (
            <li key={item.id} className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/25">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-snug text-foreground">{item.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {formatDecisionCheckerText(item.subtitle, displayTimezone)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function impactPreviewValueClass(tone?: DecisionCheckerImpactPreviewRow['tone']): string {
  if (tone === 'good') return 'text-success';
  if (tone === 'bad') return 'text-error';
  if (tone === 'warning') return 'text-warning';
  return 'text-foreground';
}

export function DecisionCheckerImpactPreview({
  rows,
  displayTimezone,
  onViewAll,
  className,
}: {
  rows: DecisionCheckerImpactPreviewRow[];
  displayTimezone?: string;
  onViewAll?: () => void;
  className?: string;
}) {
  if (!rows.length) return null;

  return (
    <section className={cn(workbenchCard, 'p-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-foreground">影响摘要</h3>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className={cn('text-[11px]', workbenchLinkClass)}
          >
            查看详情
          </button>
        ) : null}
      </div>
      <ul className="divide-y divide-border/40">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate text-xs text-foreground">{row.label}</span>
              </div>
              <span className={cn('shrink-0 text-xs font-semibold tabular-nums', impactPreviewValueClass(row.tone))}>
                {formatDecisionCheckerText(row.value, displayTimezone)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
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

export function DecisionCheckerEmpty({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'rounded-xl border border-dashed border-border/70 bg-muted/15 px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground',
        className,
      )}
    >
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

export function reliabilityTone(
  level: 'high' | 'medium' | 'low',
): 'danger' | 'neutral' {
  return level === 'low' ? 'danger' : 'neutral';
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
