import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlanningPipelineProgress } from '@/components/agent/PlanningPipelineProgress';
import { RouteRunCtreProgressBand } from '@/features/agent/ctre';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DECISION_STRIP_CTA_LABEL_KEY,
  type DecisionStripCtaType,
} from '@/lib/decision-strip-model';
import { resolveCompareStripCtaLabel } from '@/lib/decision-strip-compare-cta';
import { cn } from '@/lib/utils';
import { getPersonaAlertUserBody, getPersonaAlertUserTitle, isUserVisiblePersonaAlert } from '@/lib/persona-alert-display';
import type { useDecisionStripModel } from '@/hooks/useDecisionStripModel';
import type { CompareStripSelection } from '@/lib/decision-strip-compare-cta';
import {
  trackDecisionStripEvidenceOpen,
  trackDecisionStripExpand,
  trackDecisionStripImpression,
  trackDecisionStripPrimaryCta,
  trackDecisionStripDeepLink,
} from '@/utils/plan-studio-decision-strip-analytics';
import {
  AlertTriangle,
  ChevronDown,
  GitCompare,
  Info,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DecisionStripDecisionLogPreview } from './DecisionStripDecisionLogPreview';
import { PlanningInboxBadge } from './PlanningInboxBadge';
import {
  PlanningDetailsPanel,
  PlanningExpandToggle,
  PlanningHeaderCopy,
  PlanningHeaderIcon,
  PlanningHeaderRow,
  PlanningHeaderSection,
  PlanningScoreBadge,
  resolveStripAccent,
} from './plan-studio-header-ui';

type StripModel = ReturnType<typeof useDecisionStripModel>;

export interface DecisionStripProps {
  tripId: string;
  model: StripModel;
  hasGuards?: boolean;
  onPrimaryCta: (type: DecisionStripCtaType) => void;
  /** 规划待办收件箱（Tasks · planningInbox） */
  onOpenPlanningInbox?: () => void;
  onOpenEvidence?: () => void;
  onOpenCausalInsight?: () => void;
  hasCausalInsight?: boolean;
  onOpenDecisionCockpit?: () => void;
  hasDecisionCockpit?: boolean;
  /** 方案矩阵选中列 → 主 CTA 文案联动 */
  compareSelection?: CompareStripSelection | null;
  /** 单行摘要 + 详情按需展开 */
  compact?: boolean;
  /** 嵌入 PlanStudioPlanningHeader */
  embedded?: boolean;
  className?: string;
}

function stripTone(state: StripModel['state'], hasCompare: boolean) {
  if (state === 'error') return 'error' as const;
  if (state === 'blocked') return 'blocked' as const;
  if (hasCompare) return 'compare' as const;
  if (state === 'running') return 'running' as const;
  return 'info' as const;
}

const TONE_CLASS = {
  error:
    'border-border/80 bg-muted/20 text-foreground [&>svg]:text-error',
  blocked:
    'border-border/80 bg-muted/20 text-foreground [&>svg]:text-warning',
  compare: 'border-primary/30 bg-primary/5 text-foreground',
  running: 'border-border/70 bg-muted/30 text-foreground',
  info: 'border-border/70 bg-muted/20 text-foreground [&>svg]:text-muted-foreground',
};

function resolveCtaLabel(
  t: (key: string, options?: { defaultValue?: string }) => string,
  type: DecisionStripCtaType,
  isRunning: boolean,
  labelOverride?: string,
): string {
  if (labelOverride?.trim()) return labelOverride.trim();
  if (isRunning) {
    return t('planStudio.decisionStrip.cta.viewProgress', { defaultValue: '查看进度' });
  }
  const key = DECISION_STRIP_CTA_LABEL_KEY[type];
  const defaults: Record<string, string> = {
    openAssistant: '打开助手',
    openPlanGate: '查看方案对比',
    adjustSchedule: '微调时间',
    openFeasibility: '调整方案',
    optimize: '一键优化',
    confirmContinue: '确认并继续',
    openNegotiation: '选择方案',
    openBudget: '确认预算结构',
    openConflicts: '查看规划待办',
    confirmRegret: '确认体验底线',
    openTeam: '对齐团队节奏',
  };
  return t(`planStudio.decisionStrip.cta.${key}`, { defaultValue: defaults[key] });
}

export function DecisionStrip({
  tripId,
  model,
  hasGuards = false,
  onPrimaryCta,
  onOpenPlanningInbox,
  onOpenEvidence,
  onOpenCausalInsight,
  hasCausalInsight = false,
  onOpenDecisionCockpit,
  hasDecisionCockpit = false,
  compareSelection,
  compact = false,
  embedded = false,
  className,
}: DecisionStripProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [compactDetailsOpen, setCompactDetailsOpen] = useState(false);
  const impressionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tripId || !model.showStrip) return;
    const key = `${tripId}:${model.state}:${Boolean(model.compareSummary)}`;
    if (impressionKeyRef.current === key) return;
    impressionKeyRef.current = key;
    trackDecisionStripImpression({
      tripId,
      stripState: model.state,
      hasGuards,
    });
  }, [tripId, model.showStrip, model.state, model.compareSummary, hasGuards]);

  const handlePrimaryCta = (type: DecisionStripCtaType) => {
    trackDecisionStripPrimaryCta({
      tripId,
      ctaType: type,
      stripState: model.state,
    });
    onPrimaryCta(type);
  };

  const handleExpandChange = (next: boolean) => {
    setExpanded(next);
    trackDecisionStripExpand({ tripId, expanded: next });
  };

  const handleOpenEvidence = () => {
    trackDecisionStripEvidenceOpen({ tripId, source: 'strip' });
    trackDecisionStripDeepLink({
      tripId,
      target: 'evidence_drawer',
      stripState: model.state,
    });
    onOpenEvidence?.();
  };

  const handleOpenCausalInsight = () => {
    trackDecisionStripDeepLink({
      tripId,
      target: 'causal_insight',
      stripState: model.state,
    });
    onOpenCausalInsight?.();
  };

  const handleOpenDecisionCockpit = () => {
    trackDecisionStripDeepLink({
      tripId,
      target: 'decision_cockpit',
      stripState: model.state,
    });
    onOpenDecisionCockpit?.();
  };

  const handleMobileExpand = () => {
    setMobileExpanded(true);
    trackDecisionStripExpand({ tripId, expanded: true });
  };

  if (!model.showStrip) return null;

  const tone = stripTone(model.state, Boolean(model.compareSummary));
  const showOrchestrationProgress = model.orchestrationRunning;

  const Icon =
    model.state === 'running'
      ? Loader2
      : model.state === 'error' || model.state === 'blocked'
        ? AlertTriangle
        : model.compareSummary
          ? GitCompare
          : Info;

  const idleHeadline = t('planStudio.decisionStrip.idleHeadline', {
    defaultValue: '向助手描述需求，或在下方日程中微调',
  });
  const displayHeadline =
    model.headline || (model.state === 'idle' ? idleHeadline : idleHeadline);
  const ctaLabel = resolveCtaLabel(
    t,
    model.primaryCta.type,
    model.state === 'running',
    model.primaryCta.labelOverride ??
      resolveCompareStripCtaLabel(model.primaryCta.type, compareSelection),
  );
  const showInboxBadge = model.planningInboxCount > 0;
  const inboxBadge = showInboxBadge ? (
    onOpenPlanningInbox ? (
      <button
        type="button"
        className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(e) => {
          e.stopPropagation();
          onOpenPlanningInbox();
        }}
        aria-label={`${model.planningInboxCount} 项规划待办`}
      >
        <PlanningInboxBadge count={model.planningInboxCount} />
      </button>
    ) : (
      <PlanningInboxBadge count={model.planningInboxCount} />
    )
  ) : null;
  const planningInboxMode = Boolean(model.planningReadiness?.active);
  const detailsExpandLabel = planningInboxMode
    ? t('planStudio.decisionStrip.whyInbox', { defaultValue: '为什么有待办' })
    : t('planStudio.decisionStrip.viewDetails', { defaultValue: '查看依据' });
  const detailsCollapseLabel = planningInboxMode
    ? t('planStudio.decisionStrip.collapseInbox', { defaultValue: '收起说明' })
    : t('planStudio.decisionStrip.collapse', { defaultValue: '收起依据' });
  const primaryButtonVariant =
    planningInboxMode && model.planningReadiness?.tone === 'warning' ? 'outline' : 'default';

  const sectionLabel =
    model.planningReadiness?.active && model.state !== 'running'
      ? t('planStudio.decisionStrip.planningReadinessLabel', { defaultValue: '规划决策' })
      : model.compareSummary && model.state !== 'running'
        ? t('planStudio.decisionStrip.compareLabel', { defaultValue: '方案对比' })
        : null;

  const detailsBlock = (
    <>
      {model.planningReadiness?.chips.length ? (
        <div className="rounded-md border border-border/60 bg-background/60 p-2 text-xs space-y-1">
          <p className="font-medium">
            {t('planStudio.decisionStrip.planningSignals', { defaultValue: '待决策项' })}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {model.planningReadiness.chips.join(' · ')}
          </p>
        </div>
      ) : null}

      {model.compareSummary ? (
        <div className="rounded-md border border-border/60 bg-background/60 p-2 text-xs space-y-1">
          <p className="font-medium">
            {t('planStudio.decisionStrip.recommendedOption', { defaultValue: '推荐方案' })}
            ：<span className="font-mono">{model.compareSummary.recommendedOptionId}</span>
          </p>
          <p className="text-muted-foreground leading-relaxed">{model.compareSummary.reason}</p>
          {model.compareSummary.divergesFromLlm ? (
            <p className="text-warning">
              {t('planStudio.decisionStrip.kernelOverride', {
                defaultValue: 'Kernel 门控覆盖 LLM 推荐',
              })}
              {model.compareSummary.llmRecommendedOptionId
                ? `（LLM: ${model.compareSummary.llmRecommendedOptionId}）`
                : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      {model.personaLine &&
      model.compareSummary &&
      model.state !== 'running' &&
      !model.subline?.includes(model.personaLine.text) ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {model.personaLine.personaLabel}：{model.personaLine.text}
        </p>
      ) : null}

      {model.personaMode === 'single_lead' && model.personaLine ? (
        <div className="rounded-md border border-border/60 bg-background/60 p-2 text-xs space-y-1">
          <p className="font-medium">
            {model.personaLeadHeadline ?? model.personaLine.personaLabel}
          </p>
          <p className="text-muted-foreground leading-relaxed">{model.personaLine.text}</p>
        </div>
      ) : (
        model.personaAlerts
          .filter(isUserVisiblePersonaAlert)
          .slice(0, 3)
          .map((alert) => (
            <p key={alert.id} className="text-xs text-muted-foreground leading-relaxed">
              {(alert.persona === 'ABU'
                ? 'Abu'
                : alert.persona === 'DR_DRE'
                  ? 'Dr.Dre'
                  : alert.persona === 'NEPTUNE'
                    ? 'Neptune'
                    : alert.persona) + '：'}
              {getPersonaAlertUserTitle(alert)} — {getPersonaAlertUserBody(alert)}
            </p>
          ))
      )}

      {model.decisionCockpitSummary ? (
        <div className="rounded-md border border-border/60 bg-background/60 p-2 text-xs space-y-1">
          <p className="font-medium">
            {t('planStudio.decisionStrip.decisionCockpitSummary', {
              defaultValue: '决策驾驶舱摘要',
            })}
          </p>
          <p className="text-muted-foreground leading-relaxed">{model.decisionCockpitSummary.headline}</p>
          {model.decisionCockpitSummary.subline ? (
            <p className="text-muted-foreground/80 leading-relaxed">{model.decisionCockpitSummary.subline}</p>
          ) : null}
        </div>
      ) : null}

      {model.lastRequestId ? (
        <p className="font-mono text-[10px] text-muted-foreground">
          request_id: {model.lastRequestId}
        </p>
      ) : null}

      <DecisionStripDecisionLogPreview tripId={tripId} enabled={expanded || compactDetailsOpen} />

      {onOpenEvidence ? (
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleOpenEvidence}>
          {t('planStudio.decisionStrip.openEvidence', { defaultValue: '打开决策证据' })}
        </Button>
      ) : null}
      {onOpenCausalInsight && hasCausalInsight ? (
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleOpenCausalInsight}>
          {t('planStudio.decisionStrip.openCausalInsight', { defaultValue: '查看因果链' })}
        </Button>
      ) : null}
      {onOpenDecisionCockpit && hasDecisionCockpit ? (
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleOpenDecisionCockpit}>
          {t('planStudio.decisionStrip.openDecisionCockpit', { defaultValue: '查看决策驾驶舱' })}
        </Button>
      ) : null}
    </>
  );

  if (compact && !isMobile) {
    const stripAccent = resolveStripAccent(tone);
    const iconSpin = model.state === 'running';

    return (
      <PlanningHeaderSection accent={stripAccent} className={className}>
        <PlanningHeaderRow>
          <PlanningHeaderIcon icon={Icon} accent={stripAccent} spin={iconSpin} />
          <PlanningHeaderCopy
            kicker={sectionLabel ?? t('planStudio.decisionStrip.verifyStep', { defaultValue: '可执行性验证' })}
            title={displayHeadline}
          >
            {model.planningReadiness?.active && model.primaryCta.type !== 'open_conflicts'
              ? inboxBadge
              : null}
          </PlanningHeaderCopy>
          {model.score != null && model.state !== 'running' ? (
            <PlanningScoreBadge score={model.score} />
          ) : null}
          <Button
            size="sm"
            variant={primaryButtonVariant}
            className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs shadow-sm"
            onClick={() => handlePrimaryCta(model.primaryCta.type)}
          >
            {model.primaryCta.type === 'open_plan_gate' ? (
              <GitCompare className="h-3.5 w-3.5" />
            ) : model.primaryCta.type === 'open_assistant' || model.primaryCta.type === 'optimize' ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : null}
            <span className="max-w-[7.5rem] truncate">{ctaLabel}</span>
            {model.primaryCta.type === 'open_conflicts' ? inboxBadge : null}
          </Button>
          <PlanningExpandToggle
            expanded={compactDetailsOpen}
            labelExpand={detailsExpandLabel}
            labelCollapse={detailsCollapseLabel}
            onClick={() => {
              setCompactDetailsOpen((v) => !v);
              trackDecisionStripExpand({ tripId, expanded: !compactDetailsOpen });
            }}
          />
        </PlanningHeaderRow>

        {showOrchestrationProgress ? (
          <div className="px-3.5 pb-2 space-y-2">
            <PlanningPipelineProgress
              compact
              message={model.taskMessage}
              currentPhase={model.taskPhase}
              progressPercentage={model.taskProgress}
            />
            <RouteRunCtreProgressBand compact orchestrationPercent={model.taskProgress} />
          </div>
        ) : null}

        <PlanningDetailsPanel open={compactDetailsOpen}>
          {model.subline ? (
            <p className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
              {model.subline}
            </p>
          ) : null}
          {detailsBlock}
        </PlanningDetailsPanel>
      </PlanningHeaderSection>
    );
  }

  if (isMobile && !mobileExpanded) {
    return (
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left shadow-sm',
          TONE_CLASS[tone],
          className,
        )}
        onClick={handleMobileExpand}
        role="status"
        aria-live="polite"
        aria-expanded={false}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            model.state === 'running' && 'animate-spin text-foreground',
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{displayHeadline}</span>
        {inboxBadge}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        embedded ? '' : 'rounded-lg border shadow-sm',
        embedded || compact ? 'px-3 py-2' : 'px-4 py-3.5',
        TONE_CLASS[tone],
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={model.state === 'running'}
      aria-expanded={isMobile ? mobileExpanded : undefined}
    >
      {isMobile ? (
        <div className="mb-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMobileExpanded(false)}
          >
            {t('planStudio.decisionStrip.collapse', { defaultValue: '收起' })}
            <ChevronDown className="ml-1 h-3.5 w-3.5 rotate-180" />
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <Icon
              className={cn(
                'h-4 w-4',
                model.state === 'running' && 'animate-spin text-foreground',
              )}
            />
          </div>
          <div className="min-w-0 space-y-1">
            {model.planningReadiness?.active && model.state !== 'running' ? (
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                {t('planStudio.decisionStrip.planningReadinessLabel', { defaultValue: '规划决策摘要' })}
                {inboxBadge}
              </p>
            ) : model.compareSummary && model.state !== 'running' ? (
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('planStudio.decisionStrip.compareLabel', { defaultValue: '方案对比推荐' })}
              </p>
            ) : null}
            <p className="text-sm font-semibold leading-snug flex flex-wrap items-center gap-2">
              <span>{displayHeadline}</span>
              {model.planningReadiness?.active ? null : inboxBadge}
            </p>
            {model.subline ? (
              <p className="text-xs text-muted-foreground leading-relaxed">{model.subline}</p>
            ) : null}
            {model.personaLine &&
            model.compareSummary &&
            model.state !== 'running' &&
            !model.subline?.includes(model.personaLine.text) ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {model.personaLine.personaLabel}：{model.personaLine.text}
              </p>
            ) : null}
          </div>
        </div>

        {model.score != null && model.state !== 'running' ? (
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-muted-foreground">
              {t('planStudio.decisionStrip.scoreLabel', { defaultValue: '行程评分' })}
            </p>
            <p className="text-xl font-semibold tabular-nums leading-none">{model.score}</p>
          </div>
        ) : null}
      </div>

      {showOrchestrationProgress ? (
        <div className="mt-3 space-y-2">
          <PlanningPipelineProgress
            compact
            message={model.taskMessage}
            currentPhase={model.taskPhase}
            progressPercentage={model.taskProgress}
          />
          <RouteRunCtreProgressBand compact orchestrationPercent={model.taskProgress} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={primaryButtonVariant}
          className="gap-1.5"
          onClick={() => handlePrimaryCta(model.primaryCta.type)}
        >
          {model.primaryCta.type === 'open_plan_gate' ? (
            <GitCompare className="mr-1.5 h-3.5 w-3.5" />
          ) : model.primaryCta.type === 'open_assistant' || model.primaryCta.type === 'optimize' ? (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          ) : null}
          {ctaLabel}
          {model.primaryCta.type === 'open_conflicts' ? inboxBadge : null}
        </Button>

        <Collapsible open={expanded} onOpenChange={handleExpandChange}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
              {detailsExpandLabel}
              <ChevronDown
                className={cn('ml-1 h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">{detailsBlock}</CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
