import { ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { DecisionCheckerPlanningInterim } from '@/lib/decision-checker-interim.util';
import type { DecisionCheckerOverviewDto } from '@/types/decision-checker';
import {
  DecisionCheckerAiBox,
  DecisionCheckerBadge,
  DecisionCheckerEmpty,
  DecisionCheckerMetricGrid,
  DecisionCheckerSection,
  formatDecisionCheckerText,
} from './decision-checker-ui';
import { workbenchDecisionCheckerBenefitItem, workbenchDecisionCheckerStaleBanner, workbenchPrimaryAction } from '../workbench-ui';

export interface DecisionCheckerOverviewTabProps {
  model: DecisionCheckerOverviewDto;
  loading?: boolean;
  awaitingEmbedded?: boolean;
  planningInterim?: DecisionCheckerPlanningInterim | null;
  unavailable?: boolean;
  error?: string | null;
  isStale?: boolean;
  staleReason?: string;
  onViewEvidence?: () => void;
  onViewRepair?: () => void;
  onExploreMore?: () => void;
  primaryCtaLabel?: string;
  showExploreMore?: boolean;
  displayTimezone?: string;
}

function DecisionCheckerLoadingPanel({
  planningInterim,
  awaitingEmbedded,
  displayTimezone,
}: {
  planningInterim?: DecisionCheckerPlanningInterim | null;
  awaitingEmbedded?: boolean;
  displayTimezone?: string;
}) {
  if (planningInterim && planningInterim.total > 0) {
    return (
      <div className="space-y-3">
        <DecisionCheckerSection
          title="冲突概览（来自规划冲突）"
          action={
            planningInterim.mustHandle > 0 ? (
              <DecisionCheckerBadge tone="danger">必处理 {planningInterim.mustHandle}</DecisionCheckerBadge>
            ) : null
          }
        >
          <p className="text-xs font-medium text-foreground">
            共 {planningInterim.total} 项冲突
            {planningInterim.suggestAdjust > 0
              ? ` · ${planningInterim.suggestAdjust} 项建议调整`
              : ''}
          </p>
          {planningInterim.verdictHeadline ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{planningInterim.verdictHeadline}</p>
          ) : null}
          {planningInterim.topConflictTitle ? (
            <p className="mt-2 text-xs font-medium text-foreground">{planningInterim.topConflictTitle}</p>
          ) : null}
          {planningInterim.topConflictMessage ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {formatDecisionCheckerText(planningInterim.topConflictMessage, displayTimezone)}
            </p>
          ) : null}
        </DecisionCheckerSection>
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/15 px-3 py-3 text-[11px] text-muted-foreground">
          <Spinner className="h-3.5 w-3.5 shrink-0" />
          <span>
            {awaitingEmbedded
              ? '正在等待聚合接口返回决策检查详情…'
              : '正在补全证据链与修复方案…'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <DecisionCheckerEmpty>
      <span className="inline-flex items-center justify-center gap-2">
        <Spinner className="h-3.5 w-3.5" />
        正在聚合可行性与决策检查数据…
      </span>
      <span className="mt-2 block text-[10px] leading-relaxed">
        {awaitingEmbedded
          ? '正在通过备用接口补全决策检查详情…'
          : '决策检查器正在后台计算，将按约 5s 间隔轮询 taskId（通常数秒内就绪）。'}
      </span>
    </DecisionCheckerEmpty>
  );
}

export function DecisionCheckerOverviewTab({
  model,
  loading,
  awaitingEmbedded,
  planningInterim,
  unavailable,
  error,
  isStale,
  staleReason,
  onViewEvidence,
  onViewRepair,
  onExploreMore,
  primaryCtaLabel = '查看修复方案',
  showExploreMore,
  displayTimezone,
}: DecisionCheckerOverviewTabProps) {
  const { conflict, repairPlan, aiSuggestion } = model;
  const hardCount = conflict?.hardCount ?? 0;
  const softCount = conflict?.softCount;
  const primaryConflict = conflict?.primary;

  if (loading) {
    return (
      <DecisionCheckerLoadingPanel
        planningInterim={planningInterim}
        awaitingEmbedded={awaitingEmbedded}
        displayTimezone={displayTimezone}
      />
    );
  }

  if (error) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (unavailable) {
    return (
      <DecisionCheckerEmpty>
        决策检查器接口尚未就绪。请确认后端已部署 GET /trips/:tripId/decision-checker。
      </DecisionCheckerEmpty>
    );
  }

  if (!primaryConflict && !repairPlan && hardCount === 0) {
    return (
      <DecisionCheckerEmpty>
        当前未检测到需处理的硬冲突。调整约束或生成方案后，将在此展示冲突概览与推荐修复路径。
      </DecisionCheckerEmpty>
    );
  }

  return (
    <div className="space-y-3">
      {isStale ? (
        <p className={cn('px-2.5 py-2', workbenchDecisionCheckerStaleBanner)}>
          快照已过期{staleReason ? `：${staleReason}` : ''}，建议刷新后查看最新结论。
        </p>
      ) : null}

      {primaryConflict ? (
        <DecisionCheckerSection
          title="冲突概览"
          action={
            primaryConflict.severity === 'hard' || hardCount > 0 ? (
              <DecisionCheckerBadge tone="danger">硬冲突</DecisionCheckerBadge>
            ) : null
          }
        >
          <p className="text-xs font-medium text-foreground">
            检测到 {hardCount} 个硬冲突
            {softCount != null && softCount > 0
              ? ` · ${softCount} 个软偏好待优化`
              : ''}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {formatDecisionCheckerText(primaryConflict.message, displayTimezone)}
          </p>
          {onViewEvidence ? (
            <button
              type="button"
              onClick={onViewEvidence}
              className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            >
              查看冲突证据
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </DecisionCheckerSection>
      ) : null}

      {repairPlan ? (
        <DecisionCheckerSection
          title="推荐修复方案"
          action={
            repairPlan.badge ? (
              <DecisionCheckerBadge tone="success">{repairPlan.badge}</DecisionCheckerBadge>
            ) : null
          }
        >
          <p className="text-sm font-semibold text-foreground">{repairPlan.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {formatDecisionCheckerText(repairPlan.description, displayTimezone)}
          </p>
          <div className="mt-3">
            <DecisionCheckerMetricGrid metrics={repairPlan.metrics} displayTimezone={displayTimezone} />
          </div>
          {repairPlan.benefits?.length ? (
            <ul className="mt-3 space-y-1.5">
              {repairPlan.benefits.map((benefit) => (
                <li key={benefit} className={cn('flex items-start gap-2 text-xs', workbenchDecisionCheckerBenefitItem)}>
                  <span aria-hidden>✓</span>
                  <span>{formatDecisionCheckerText(benefit, displayTimezone)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 space-y-2">
            {onViewRepair ? (
              <Button className={cn('w-full', workbenchPrimaryAction)} size="sm" onClick={onViewRepair}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {repairPlan.cta?.label ?? primaryCtaLabel}
              </Button>
            ) : null}
            {showExploreMore && onExploreMore ? (
              <Button variant="outline" className="w-full" size="sm" onClick={onExploreMore}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                探索更多方案
              </Button>
            ) : null}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {aiSuggestion?.text ? (
        <DecisionCheckerAiBox>
          <p className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            AI 建议
          </p>
          <p className="mt-1 text-muted-foreground">{aiSuggestion.text}</p>
        </DecisionCheckerAiBox>
      ) : null}
    </div>
  );
}
