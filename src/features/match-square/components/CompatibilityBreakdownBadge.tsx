import { CheckCircle2, AlertTriangle, Info, Minus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type {
  MatchDimensionBreakdown,
  MatchInsightDrawer,
  StructuralMatchInsight,
} from '@/types/match-square';
import { MATCH_DIMENSION_LABELS } from '../lib/constants';
import { compatibilityFitClass, plazaBadge } from '../lib/plaza-visual';

interface CompatibilityBreakdownBadgeProps {
  percent: number;
  breakdown?: MatchDimensionBreakdown | null;
  /** 集成指南 §4 — API 下发的麦肯锡式三行诊断 */
  matchInsightDrawer?: MatchInsightDrawer | null;
  className?: string;
}

function formatDimensionDelta(score: number): string {
  const delta = Math.round((score - 13) * 2.5);
  if (delta === 0) return '±0';
  return delta > 0 ? `+${delta}%` : `${delta}%`;
}

function insightIcon(level: StructuralMatchInsight['level']) {
  switch (level) {
    case 'pass':
      return CheckCircle2;
    case 'warn':
      return AlertTriangle;
    case 'fail':
      return AlertTriangle;
  }
}

function insightClass(level: StructuralMatchInsight['level']): string {
  switch (level) {
    case 'pass':
      return 'text-[var(--gate-allow-foreground)]';
    case 'warn':
      return 'text-[var(--gate-confirm-foreground)]';
    case 'fail':
      return 'text-destructive';
  }
}

function drawerIcon(status: MatchInsightDrawer['lines'][0]['status']) {
  switch (status) {
    case 'ok':
      return CheckCircle2;
    case 'warn':
      return AlertTriangle;
    default:
      return Minus;
  }
}

function drawerClass(status: MatchInsightDrawer['lines'][0]['status']): string {
  switch (status) {
    case 'ok':
      return 'text-[var(--gate-allow-foreground)]';
    case 'warn':
      return 'text-[var(--gate-confirm-foreground)]';
    default:
      return 'text-muted-foreground';
  }
}

/** 契合度角标 + 结构稳定性报告（Match Engine v2 / matchInsightDrawer） */
export function CompatibilityBreakdownBadge({
  percent,
  breakdown,
  matchInsightDrawer,
  className,
}: CompatibilityBreakdownBadgeProps) {
  const hasDrawer = Boolean(matchInsightDrawer?.lines?.length);
  const badge = (
    <span
      className={cn(
        plazaBadge.fit,
        'rounded-lg px-2.5 py-1 shadow-sm',
        compatibilityFitClass(percent),
        className
      )}
    >
      {percent}
      <span className="text-[10px] font-normal opacity-70">%</span>
      {(breakdown || hasDrawer) && <Info className="ml-0.5 h-3 w-3 opacity-60" aria-hidden />}
    </span>
  );

  if (!breakdown && !hasDrawer) {
    return badge;
  }

  const structural = breakdown?.structuralInsights;
  const hasStructural = structural && structural.length > 0;

  const legacyRows = breakdown
    ? (
        Object.entries(breakdown) as [
          keyof MatchDimensionBreakdown,
          number | StructuralMatchInsight[] | undefined,
        ][]
      )
        .filter(
          ([key, val]) =>
            key !== 'backgroundBonus' &&
            key !== 'structuralInsights' &&
            typeof val === 'number'
        )
        .map(([key, score]) => ({
          key,
          label: MATCH_DIMENSION_LABELS[key as keyof typeof MATCH_DIMENSION_LABELS] ?? key,
          score: score as number,
          delta:
            key === 'socialBackground' && breakdown.backgroundBonus != null
              ? `+${breakdown.backgroundBonus}`
              : formatDimensionDelta(score as number),
        }))
    : [];

  const premiumRows =
    breakdown?.teamworkFit != null
      ? [
          {
            label: '团队契约分工',
            delta: `${breakdown.teamworkFit >= 0 ? '+' : ''}${breakdown.teamworkFit}`,
          },
          { label: '抗压品质对齐', delta: `${breakdown.stressFit ?? 0} / 25` },
          { label: 'MBTI 角色拼图', delta: `+${breakdown.mbtiSynergy ?? 0}` },
        ]
      : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 rounded-md outline-none transition-opacity hover:opacity-90',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          aria-label={`契合度 ${percent}%，点击查看决策翻译`}
        >
          {badge}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[min(70vh,420px)] w-80 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 p-4 shadow-lg backdrop-blur-md"
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          决策翻译
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {matchInsightDrawer?.headline ?? '团队结构稳定性'}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Match Engine · 图谱聚类 + 协同约束满足
        </p>

        {hasDrawer ? (
          <ul className="mt-3 space-y-2.5">
            {matchInsightDrawer!.lines.map((item) => {
              const Icon = drawerIcon(item.status);
              return (
                <li key={item.label} className="flex gap-2 text-xs leading-relaxed">
                  <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', drawerClass(item.status))} />
                  <div>
                    <span className="font-medium text-foreground">{item.label}</span>
                    <p className="mt-0.5 text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : hasStructural ? (
          <ul className="mt-3 space-y-2.5">
            {structural!.map((item) => {
              const Icon = insightIcon(item.level);
              return (
                <li key={item.label} className="flex gap-2 text-xs leading-relaxed">
                  <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', insightClass(item.level))} />
                  <div>
                    <span className="font-medium text-foreground">{item.label}</span>
                    <p className="mt-0.5 text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-3 space-y-2">
            {legacyRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="tabular-nums font-medium font-mono-brand">{row.delta}</span>
              </li>
            ))}
          </ul>
        )}

        {premiumRows.length > 0 && (
          <div className="mt-3 border-t border-border pt-2">
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              契约加权分量
            </p>
            <ul className="space-y-1">
              {premiumRows.map((row) => (
                <li key={row.label} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono-brand font-medium">{row.delta}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-3 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
          {percent >= 85
            ? '黄金区间 — 团队结构稳定性高，角色拼图清晰'
            : percent >= 70
              ? '可同行 — 存在可磨合的互补空间，建议行前对齐契约'
              : percent >= 50
                ? '审慎评估 — 关注⚠️项后再决策是否申请'
                : '未通过硬门槛或结构冲突明显'}
        </p>
      </PopoverContent>
    </Popover>
  );
}
