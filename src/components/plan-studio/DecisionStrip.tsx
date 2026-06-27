import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlanningPipelineProgress } from '@/components/agent/PlanningPipelineProgress';
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
import { cn } from '@/lib/utils';
import { getPersonaAlertUserBody, isUserVisiblePersonaAlert } from '@/lib/persona-alert-display';
import type { useDecisionStripModel } from '@/hooks/useDecisionStripModel';
import {
  trackDecisionStripEvidenceOpen,
  trackDecisionStripExpand,
  trackDecisionStripImpression,
  trackDecisionStripPrimaryCta,
} from '@/utils/plan-studio-decision-strip-analytics';
import {
  AlertTriangle,
  ChevronDown,
  GitCompare,
  Info,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DecisionStripDecisionLogPreview } from './DecisionStripDecisionLogPreview';
import { DecisionStripLoopValidationProgress } from './DecisionStripLoopValidationProgress';
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
  onOpenEvidence?: () => void;
  /** 单行摘要 + 详情按需展开 */
  compact?: boolean;
  /** 嵌入 PlanStudioPlanningHeader */
  embedded?: boolean;
  className?: string;
}

function stripTone(
  state: StripModel['state'],
  hasCompare: boolean,
  loopValidation: StripModel['loopValidation'],
) {
  if (state === 'error') return 'error' as const;
  if (state === 'blocked' || loopValidation?.phase === 'awaiting_approval') {
    return 'blocked' as const;
  }
  if (hasCompare) return 'compare' as const;
  if (state === 'running') return 'running' as const;
  if (loopValidation?.active && loopValidation.verifyStepStatus === 'done') return 'info' as const;
  return 'info' as const;
}

const TONE_CLASS = {
  error: 'border-red-200/80 bg-red-50/80 text-red-950 [&>svg]:text-red-600',
  blocked: 'border-amber-200/80 bg-amber-50/70 text-amber-950 [&>svg]:text-amber-700',
  compare: 'border-primary/30 bg-primary/5 text-foreground',
  running: 'border-border/70 bg-muted/30 text-foreground',
  info: 'border-sky-200/80 bg-sky-50/60 text-sky-950 [&>svg]:text-sky-700',
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
    openBudget: '确认预算结构',
    openConflicts: '打开规划待办',
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
  onOpenEvidence,
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
    onOpenEvidence?.();
  };

  const handleMobileExpand = () => {
    setMobileExpanded(true);
    trackDecisionStripExpand({ tripId, expanded: true });
  };

  if (!model.showStrip) return null;

  const tone = stripTone(model.state, Boolean(model.compareSummary), model.loopValidation);
  const showOrchestrationProgress = model.orchestrationRunning;
  const showLoopValidationProgress =
    Boolean(model.loopValidation?.active) &&
    model.loopValidation.verifyStepStatus === 'active' &&
    (model.loopValidation.progressPct != null || model.loopValidation.issueCount > 0) &&
    (model.state === 'running' ? !showOrchestrationProgress : true);

  const Icon =
    showLoopValidationProgress && !showOrchestrationProgress
      ? model.loopValidation?.verifyStepStatus === 'active'
        ? Loader2
        : ShieldCheck
      : model.state === 'running'
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
    model.primaryCta.labelOverride,
  );
  const showInboxBadge = model.planningInboxCount > 0;
  const inboxBadge = showInboxBadge ? (
    <PlanningInboxBadge count={model.planningInboxCount} />
  ) : null;

  const sectionLabel =
    model.loopValidation?.active && !model.compareSummary && model.state !== 'running'
      ? t('planStudio.decisionStrip.verifyStep', { defaultValue: '可执行性验证' })
      : model.planningReadiness?.active && model.state !== 'running'
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
            <p className="text-amber-800/90">
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

      {model.personaAlerts
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
            {getPersonaAlertUserBody(alert)}
          </p>
        ))}

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
    </>
  );

  if (compact && !isMobile) {
    const stripAccent = resolveStripAccent(tone);
    const iconSpin =
      model.state === 'running' || model.loopValidation?.verifyStepStatus === 'active';

    return (
      <PlanningHeaderSection accent={stripAccent} className={className}>
        <PlanningHeaderRow>
          <PlanningHeaderIcon icon={Icon} accent={stripAccent} spin={iconSpin} />
          <PlanningHeaderCopy
            kicker={sectionLabel ?? t('planStudio.decisionStrip.verifyStep', { defaultValue: '可执行性验证' })}
            title={displayHeadline}
          >
            {model.planningReadiness?.active ? inboxBadge : null}
          </PlanningHeaderCopy>
          {model.score != null && model.state !== 'running' && !model.loopValidation?.active ? (
            <PlanningScoreBadge score={model.score} />
          ) : null}
          <Button
            size="sm"
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
            labelExpand={t('planStudio.decisionStrip.viewDetails', { defaultValue: '查看依据' })}
            labelCollapse={t('planStudio.decisionStrip.collapse', { defaultValue: '收起依据' })}
            onClick={() => {
              setCompactDetailsOpen((v) => !v);
              trackDecisionStripExpand({ tripId, expanded: !compactDetailsOpen });
            }}
          />
        </PlanningHeaderRow>

        {showOrchestrationProgress ? (
          <div className="px-3.5 pb-2">
            <PlanningPipelineProgress
              compact
              message={model.taskMessage}
              currentPhase={model.taskPhase}
              progressPercentage={model.taskProgress}
            />
          </div>
        ) : showLoopValidationProgress && model.loopValidation ? (
          <div className="px-3.5 pb-2">
            <DecisionStripLoopValidationProgress validation={model.loopValidation} compact />
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
            (model.state === 'running' ||
              model.loopValidation?.verifyStepStatus === 'active') &&
              'animate-spin text-primary',
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
                (model.state === 'running' ||
                  model.loopValidation?.verifyStepStatus === 'active') &&
                  'animate-spin text-primary',
              )}
            />
          </div>
          <div className="min-w-0 space-y-1">
            {model.loopValidation?.active &&
            !model.compareSummary &&
            model.state !== 'running' ? (
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('planStudio.decisionStrip.verifyStep', { defaultValue: '可执行性验证' })}
              </p>
            ) : model.planningReadiness?.active && model.state !== 'running' ? (
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

        {model.score != null &&
        model.state !== 'running' &&
        !model.loopValidation?.active ? (
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-muted-foreground">
              {t('planStudio.decisionStrip.scoreLabel', { defaultValue: '行程评分' })}
            </p>
            <p className="text-xl font-semibold tabular-nums leading-none">{model.score}</p>
          </div>
        ) : null}
      </div>

      {showOrchestrationProgress ? (
        <div className="mt-3">
          <PlanningPipelineProgress
            compact
            message={model.taskMessage}
            currentPhase={model.taskPhase}
            progressPercentage={model.taskProgress}
          />
        </div>
      ) : showLoopValidationProgress && model.loopValidation ? (
        <div className="mt-3">
          <DecisionStripLoopValidationProgress
            validation={model.loopValidation}
            compact
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => handlePrimaryCta(model.primaryCta.type)}>
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
              {t('planStudio.decisionStrip.viewDetails', { defaultValue: '查看依据' })}
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
