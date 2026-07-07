import { ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { DecisionCheckerPlanningInterim } from '@/lib/decision-checker-interim.util';
import {
  buildDecisionCheckerImpactPreviewRows,
  formatRepairPlanDisplayTitle,
} from '@/lib/decision-checker-overview.util';
import type {
  DecisionCheckerEvidenceDto,
  DecisionCheckerImpactDto,
  DecisionCheckerOverviewDto,
} from '@/types/decision-checker';
import {
  DecisionCheckerAiBox,
  DecisionCheckerBadge,
  DecisionCheckerEmpty,
  DecisionCheckerEvidencePreview,
  DecisionCheckerImpactPreview,
  DecisionCheckerMetricStrip,
  DecisionCheckerSection,
  formatDecisionCheckerText,
} from './decision-checker-ui';
import { refreshRoadClassTransportMessage } from '@/lib/trip-constraints.adapter';
import type { PersonaAlert } from '@/types/trip';
import { DecisionCheckerPersonaValidationStrip } from './DecisionCheckerPersonaValidationStrip';
import { WorkbenchGateStatusBanner } from '../WorkbenchGateStatusBanner';
import {
  resolveDecisionCheckerOverviewGateMessage,
  resolveDecisionCheckerOverviewGateStatus,
} from '@/lib/decision-checker-gate.util';
import { workbenchCard, workbenchDecisionCheckerStaleBanner, workbenchLinkClass, workbenchPrimaryAction } from '../workbench-ui';
import { WorkbenchJudgmentPanel } from './WorkbenchJudgmentPanel';

export interface DecisionCheckerOverviewTabProps {
  model: DecisionCheckerOverviewDto;
  evidence?: DecisionCheckerEvidenceDto;
  impact?: DecisionCheckerImpactDto;
  loading?: boolean;
  awaitingEmbedded?: boolean;
  planningInterim?: DecisionCheckerPlanningInterim | null;
  unavailable?: boolean;
  error?: string | null;
  isStale?: boolean;
  staleReason?: string;
  onViewEvidence?: () => void;
  onViewImpact?: () => void;
  onViewRepair?: () => void;
  onExploreMore?: () => void;
  primaryCtaLabel?: string;
  showExploreMore?: boolean;
  displayTimezone?: string;
  planningActionCount?: number;
  planningActionLabel?: string;
  onOpenPlanningActions?: () => void;
  maxSegmentDistanceKm?: number | null;
  personaAlerts?: PersonaAlert[];
  selectedOptionLetter?: string;
  /** 已在决策空间内 — 隐藏「进入待办」引导 */
  decisionSpaceMode?: boolean;
  /** 决策空间：中栏已有 Gateway 方案卡 — 概览改为依据摘要，不重复推荐方案 */
  middleColumnHasOptions?: boolean;
  /** 工作台按天联动 — 仅投影当前选中日上下文 */
  scheduleDayScoped?: boolean;
  scheduleDayLabel?: string;
  /** 打开决策空间（方案对比在中栏，不在右栏） */
  onOpenDecisionSpace?: () => void;
  solutionCount?: number;
}

function PlanningActionsBanner({
  count,
  label,
  onOpen,
}: {
  count: number;
  label: string;
  onOpen?: () => void;
}) {
  if (count <= 0 || !onOpen) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-foreground">
        <span className="font-semibold">{count}</span> 项待决
        <span className="text-muted-foreground"> · 可在决策空间逐项确认</span>
      </p>
      <Button type="button" size="sm" className={cn('h-7 text-xs', workbenchPrimaryAction)} onClick={onOpen}>
        {label}
        <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function DecisionCheckerLoadingPanel({
  planningInterim,
  awaitingEmbedded,
  displayTimezone,
  planningActionCount,
  planningActionLabel,
  onOpenPlanningActions,
  decisionSpaceMode = false,
}: {
  planningInterim?: DecisionCheckerPlanningInterim | null;
  awaitingEmbedded?: boolean;
  displayTimezone?: string;
  planningActionCount?: number;
  planningActionLabel?: string;
  onOpenPlanningActions?: () => void;
  decisionSpaceMode?: boolean;
}) {
  if (planningInterim && planningInterim.total > 0) {
    return (
      <div className="space-y-3">
        {!decisionSpaceMode ? (
          <PlanningActionsBanner
            count={planningActionCount ?? planningInterim.total}
            label={planningActionLabel ?? '查看规划待办'}
            onOpen={onOpenPlanningActions}
          />
        ) : null}
        <DecisionCheckerSection
          title="冲突概览（来自规划冲突）"
          action={
            planningInterim.mustHandle > 0 ? (
              <DecisionCheckerBadge tone="danger">必处理 {planningInterim.mustHandle}</DecisionCheckerBadge>
            ) : null
          }
        >
          {!decisionSpaceMode ? (
            <p className="mb-2 text-[10px] text-muted-foreground">
              冲突位置与行程影响见中栏；此处补全证据链与方案对比。
            </p>
          ) : null}
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
          {planningInterim.topConflictMessage && decisionSpaceMode ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {formatDecisionCheckerText(planningInterim.topConflictMessage, displayTimezone)}
            </p>
          ) : !decisionSpaceMode && planningInterim.topConflictMessage ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              冲突详情见中栏当日行程卡。
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

function DecisionCheckerBasisSummary({
  model,
  evidence,
  impact,
  displayTimezone,
  primaryConflict,
  primaryConflictMessage,
  onViewEvidence,
  onViewImpact,
}: {
  model: DecisionCheckerOverviewDto;
  evidence?: DecisionCheckerEvidenceDto;
  impact?: DecisionCheckerImpactDto;
  displayTimezone?: string;
  primaryConflict?: DecisionCheckerOverviewDto['conflict']['primary'];
  primaryConflictMessage?: string | null;
  onViewEvidence?: () => void;
  onViewImpact?: () => void;
}) {
  const impactRows = impact ? buildDecisionCheckerImpactPreviewRows(impact) : [];
  const evidenceCount = evidence?.items?.length ?? 0;

  return (
    <div className="space-y-3">
      <WorkbenchGateStatusBanner
        status={resolveDecisionCheckerOverviewGateStatus(model)}
        message={resolveDecisionCheckerOverviewGateMessage(model)}
      />
      {primaryConflict ? (
        <section className={cn(workbenchCard, 'p-3')}>
          <h3 className="text-[13px] font-semibold text-foreground">当前问题</h3>
          <p className="mt-1.5 text-sm font-medium text-foreground">{primaryConflict.title}</p>
          {primaryConflictMessage ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{primaryConflictMessage}</p>
          ) : null}
        </section>
      ) : null}
      <p className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        方案选择与对比请在中栏完成；此处汇总<strong className="font-medium text-foreground">证据链</strong>
        与<strong className="font-medium text-foreground">影响范围</strong>，供确认前查阅。
      </p>
      <DecisionCheckerEvidencePreview
        items={evidence?.items}
        displayTimezone={displayTimezone}
        onViewAll={evidenceCount > 0 ? onViewEvidence : undefined}
      />
      <DecisionCheckerImpactPreview
        rows={impactRows}
        displayTimezone={displayTimezone}
        onViewAll={impactRows.length > 0 ? onViewImpact : undefined}
      />
      {evidenceCount === 0 && impactRows.length === 0 ? (
        <DecisionCheckerEmpty>暂无裁剪后的依据摘要，请查看「证据」或「影响」Tab。</DecisionCheckerEmpty>
      ) : null}
    </div>
  );
}

function DecisionCheckerRecommendationOverview({
  repairPlan,
  evidence,
  impact,
  displayTimezone,
  selectedOptionLetter,
  personaAlerts,
  onViewEvidence,
  onViewImpact,
  onViewRepair,
  onExploreMore,
  primaryCtaLabel,
  showExploreMore,
  decisionSpaceMode,
}: {
  repairPlan: NonNullable<DecisionCheckerOverviewDto['repairPlan']>;
  evidence?: DecisionCheckerEvidenceDto;
  impact?: DecisionCheckerImpactDto;
  displayTimezone?: string;
  selectedOptionLetter: string;
  personaAlerts?: PersonaAlert[];
  onViewEvidence?: () => void;
  onViewImpact?: () => void;
  onViewRepair?: () => void;
  onExploreMore?: () => void;
  primaryCtaLabel: string;
  showExploreMore?: boolean;
  decisionSpaceMode?: boolean;
}) {
  const impactRows = impact ? buildDecisionCheckerImpactPreviewRows(impact) : [];

  return (
    <div className="space-y-3">
      <section className={cn(workbenchCard, 'p-3')}>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-foreground">当前推荐</h3>
          <DecisionCheckerBadge tone="info">
            {repairPlan.badge ?? '推荐方案'}
          </DecisionCheckerBadge>
        </div>
        <p className="text-sm font-semibold leading-snug text-foreground">
          {formatRepairPlanDisplayTitle(repairPlan.title, selectedOptionLetter)}
        </p>
        {repairPlan.description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {formatDecisionCheckerText(repairPlan.description, displayTimezone)}
          </p>
        ) : null}
        <div className="mt-3">
          <DecisionCheckerMetricStrip
            metrics={repairPlan.metrics}
            displayTimezone={displayTimezone}
          />
        </div>
        <DecisionCheckerPersonaValidationStrip
          personaAlerts={personaAlerts}
          selectedOptionLetter={selectedOptionLetter}
          className="mt-3"
          compact
        />
      </section>

      <DecisionCheckerEvidencePreview
        items={evidence?.items}
        displayTimezone={displayTimezone}
        onViewAll={onViewEvidence}
      />

      <DecisionCheckerImpactPreview
        rows={impactRows}
        displayTimezone={displayTimezone}
        onViewAll={onViewImpact}
      />

      {!decisionSpaceMode ? (
        <div className="space-y-1.5 pt-1">
          {onViewRepair ? (
            <Button className={cn('h-10 w-full rounded-lg text-xs', workbenchPrimaryAction)} onClick={onViewRepair}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {repairPlan.cta?.label ?? primaryCtaLabel}
            </Button>
          ) : null}
          {showExploreMore && onExploreMore ? (
            <Button variant="outline" className="h-9 w-full rounded-lg text-xs" onClick={onExploreMore}>
              探索更多方案
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DecisionCheckerOverviewTab({
  model,
  evidence,
  impact,
  loading,
  awaitingEmbedded,
  planningInterim,
  unavailable,
  error,
  isStale,
  staleReason,
  onViewEvidence,
  onViewImpact,
  onViewRepair,
  onExploreMore,
  primaryCtaLabel = '查看修复方案',
  showExploreMore,
  displayTimezone,
  planningActionCount = 0,
  planningActionLabel = '查看规划待办',
  onOpenPlanningActions,
  maxSegmentDistanceKm,
  personaAlerts,
  selectedOptionLetter = 'A',
  decisionSpaceMode = false,
  middleColumnHasOptions = false,
  scheduleDayScoped = false,
  scheduleDayLabel,
  onOpenDecisionSpace,
  solutionCount = 0,
}: DecisionCheckerOverviewTabProps) {
  const { conflict, repairPlan, aiSuggestion } = model;
  const hardCount = conflict?.hardCount ?? 0;
  const softCount = conflict?.softCount;
  const primaryConflict = conflict?.primary;
  const showPlanningBanner =
    !decisionSpaceMode &&
    !scheduleDayScoped &&
    !repairPlan &&
    planningActionCount > 0 &&
    Boolean(onOpenPlanningActions);
  const primaryConflictMessage = primaryConflict?.message
    ? refreshRoadClassTransportMessage(
        formatDecisionCheckerText(primaryConflict.message, displayTimezone),
        maxSegmentDistanceKm,
      )
    : null;

  if (loading) {
    return (
      <DecisionCheckerLoadingPanel
        planningInterim={planningInterim}
        awaitingEmbedded={awaitingEmbedded}
        displayTimezone={displayTimezone}
        planningActionCount={planningActionCount}
        planningActionLabel={planningActionLabel}
        onOpenPlanningActions={onOpenPlanningActions}
        decisionSpaceMode={decisionSpaceMode}
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
    if (planningInterim && (planningInterim.topConflictTitle || planningInterim.verdictHeadline)) {
      return (
        <WorkbenchJudgmentPanel
          model={model}
          evidence={evidence}
          impact={impact}
          planningInterim={planningInterim}
          displayTimezone={displayTimezone}
          maxSegmentDistanceKm={maxSegmentDistanceKm}
          scheduleDayScoped={scheduleDayScoped}
          scheduleDayLabel={scheduleDayLabel}
          solutionCount={solutionCount}
          onViewEvidence={onViewEvidence}
          onViewImpact={onViewImpact}
          onOpenDecisionSpace={onOpenDecisionSpace}
        />
      );
    }
    return (
      <DecisionCheckerEmpty>
        当前未检测到需处理的硬冲突。调整约束或生成方案后，将在此展示冲突概览与推荐修复路径。
      </DecisionCheckerEmpty>
    );
  }

  if (repairPlan) {
    const useBasisSummary = decisionSpaceMode && middleColumnHasOptions;

    if (!decisionSpaceMode) {
      return (
        <div className="space-y-3">
          {isStale ? (
            <p className={cn('px-2.5 py-2', workbenchDecisionCheckerStaleBanner)}>
              快照已过期{staleReason ? `：${staleReason}` : ''}，建议刷新后查看最新结论。
            </p>
          ) : null}
          <WorkbenchJudgmentPanel
            model={model}
            evidence={evidence}
            impact={impact}
            planningInterim={planningInterim}
            displayTimezone={displayTimezone}
            maxSegmentDistanceKm={maxSegmentDistanceKm}
            scheduleDayScoped={scheduleDayScoped}
            scheduleDayLabel={scheduleDayLabel}
            solutionCount={solutionCount}
            onViewEvidence={onViewEvidence}
            onViewImpact={onViewImpact}
            onOpenDecisionSpace={onOpenDecisionSpace}
          />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {isStale ? (
          <p className={cn('px-2.5 py-2', workbenchDecisionCheckerStaleBanner)}>
            快照已过期{staleReason ? `：${staleReason}` : ''}，建议刷新后查看最新结论。
          </p>
        ) : null}
        {useBasisSummary ? (
          <DecisionCheckerBasisSummary
            model={model}
            evidence={evidence}
            impact={impact}
            displayTimezone={displayTimezone}
            primaryConflict={primaryConflict}
            primaryConflictMessage={primaryConflictMessage}
            onViewEvidence={onViewEvidence}
            onViewImpact={onViewImpact}
          />
        ) : (
          <DecisionCheckerRecommendationOverview
            repairPlan={repairPlan}
            evidence={evidence}
            impact={impact}
            displayTimezone={displayTimezone}
            selectedOptionLetter={selectedOptionLetter}
            personaAlerts={personaAlerts}
            onViewEvidence={onViewEvidence}
            onViewImpact={onViewImpact}
            onViewRepair={onViewRepair}
            onExploreMore={onExploreMore}
            primaryCtaLabel={primaryCtaLabel}
            showExploreMore={showExploreMore}
            decisionSpaceMode={decisionSpaceMode}
          />
        )}
        {aiSuggestion?.text && !useBasisSummary ? (
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

  if (decisionSpaceMode && middleColumnHasOptions) {
    return (
      <div className="space-y-3">
        {isStale ? (
          <p className={cn('px-2.5 py-2', workbenchDecisionCheckerStaleBanner)}>
            快照已过期{staleReason ? `：${staleReason}` : ''}，建议刷新后查看最新结论。
          </p>
        ) : null}
        <DecisionCheckerBasisSummary
          model={model}
          evidence={evidence}
          impact={impact}
          displayTimezone={displayTimezone}
          primaryConflict={primaryConflict}
          primaryConflictMessage={primaryConflictMessage}
          onViewEvidence={onViewEvidence}
          onViewImpact={onViewImpact}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {decisionSpaceMode && primaryConflict?.title ? (
        <p className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
          正在处理：
          <span className="font-medium text-foreground">{primaryConflict.title}</span>
        </p>
      ) : null}
      <WorkbenchGateStatusBanner
        status={resolveDecisionCheckerOverviewGateStatus(model)}
        message={resolveDecisionCheckerOverviewGateMessage(model)}
      />
      {showPlanningBanner ? (
        <PlanningActionsBanner
          count={planningActionCount}
          label={planningActionLabel}
          onOpen={onOpenPlanningActions}
        />
      ) : null}
      {isStale ? (
        <p className={cn('px-2.5 py-2', workbenchDecisionCheckerStaleBanner)}>
          快照已过期{staleReason ? `：${staleReason}` : ''}，建议刷新后查看最新结论。
        </p>
      ) : null}

      {primaryConflict ? (
        scheduleDayScoped ? (
          <WorkbenchJudgmentPanel
            model={model}
            evidence={evidence}
            impact={impact}
            planningInterim={planningInterim}
            displayTimezone={displayTimezone}
            maxSegmentDistanceKm={maxSegmentDistanceKm}
            scheduleDayScoped
            scheduleDayLabel={scheduleDayLabel}
            solutionCount={solutionCount}
            onViewEvidence={onViewEvidence}
            onViewImpact={onViewImpact}
            onOpenDecisionSpace={onOpenDecisionSpace}
          />
        ) : (
        <DecisionCheckerSection
          title="冲突概览"
          action={
            primaryConflict.severity === 'hard' || hardCount > 0 ? (
              <DecisionCheckerBadge tone="danger">硬冲突</DecisionCheckerBadge>
            ) : null
          }
        >
          {!decisionSpaceMode ? (
            <p className="text-[11px] text-muted-foreground">
              冲突位置与行程影响见中栏「行程与冲突分析」；此处仅保留计数与证据入口。
            </p>
          ) : null}
          <>
            <p className={cn('text-sm font-medium text-foreground', !decisionSpaceMode && 'mt-2')}>
              检测到 {hardCount} 个硬冲突
              {softCount != null && softCount > 0
                ? ` · ${softCount} 个软偏好待优化`
                : ''}
            </p>
            {decisionSpaceMode ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/85">
                {primaryConflictMessage ??
                  (primaryConflict?.message
                    ? formatDecisionCheckerText(primaryConflict.message, displayTimezone)
                    : null)}
              </p>
            ) : primaryConflict.title ? (
              <p className="mt-1 text-xs font-medium text-foreground/90">{primaryConflict.title}</p>
            ) : null}
          </>
          {onViewEvidence ? (
            <button
              type="button"
              onClick={onViewEvidence}
              className={cn('mt-2 inline-flex items-center gap-0.5 text-xs', workbenchLinkClass)}
            >
              查看冲突证据
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </DecisionCheckerSection>
        )
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
