import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DecisionStripProps } from '@/components/plan-studio/DecisionStrip';
import type { RelaxationSuggestionBarProps } from '@/components/plan-studio/RelaxationSuggestionBar';
import type { UseSolutionMatrixModelResult } from '@/hooks/useSolutionMatrixModel';
import type { UseDecisionCheckerResult } from '@/hooks/useDecisionChecker';
import type { DecisionCheckerPlanningInterim } from '@/lib/decision-checker-interim.util';
import { runDecisionCheckerAction } from '@/lib/decision-checker-action.util';
import { DECISION_STRIP_CTA_LABEL_KEY } from '@/lib/decision-strip-model';
import { normalizeDecisionCheckerResponse } from '@/types/decision-checker';
import type { DecisionCheckerSplitPlanDto } from '@/types/decision-checker';
import type { DecisionStripCtaType } from '@/lib/decision-strip-model';
import { useTranslation } from 'react-i18next';
import { DecisionCheckerOverviewTab } from './decision-checker/DecisionCheckerOverviewTab';
import { DecisionCheckerEvidenceTab } from './decision-checker/DecisionCheckerEvidenceTab';
import { DecisionCheckerImpactTab } from './decision-checker/DecisionCheckerImpactTab';
import { DecisionCheckerCounterfactualTab } from './decision-checker/DecisionCheckerCounterfactualTab';
import { DecisionCheckerSplitTab } from './decision-checker/DecisionCheckerSplitTab';
import {
  workbenchDecisionShell,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchDecisionCheckerTabList,
  workbenchDecisionCheckerTabTrigger,
  workbenchPrimaryAction,
  workbenchScrollable,
} from './workbench-ui';

export interface PlanningWorkbenchDecisionCheckerProps {
  tripId: string;
  decisionChecker?: UseDecisionCheckerResult;
  strip: DecisionStripProps;
  solutionMatrix?: {
    matrix: UseSolutionMatrixModelResult;
  };
  relaxation?: RelaxationSuggestionBarProps;
  onPrimaryCta: DecisionStripProps['onPrimaryCta'];
  onOpenFeasibility?: () => void;
  onApplySplitPlan?: (splitPlanId: string) => void;
  onDiscussSplitWithNara?: (payload: Record<string, unknown>) => void;
  onViewSplitAlternatives?: () => void;
  splitPlanSnapshotStale?: boolean;
  /** 有待应用 daySplits 时为 true */
  splitPreviewPending?: boolean;
  requestedTab?: string | null;
  /** 决策空间模式：底部展示确认选中方案 CTA */
  decisionSpaceMode?: boolean;
  selectedOptionLetter?: string;
  onConfirmSelectedOption?: () => void;
  /** planning-conflicts 已返回、decisionChecker 仍加载时的中栏摘要 */
  planningInterim?: DecisionCheckerPlanningInterim | null;
  /** 目的地时区 — 格式化 BFF 文案中的 ISO 时间 */
  displayTimezone?: string;
  /** eligibility 过滤后的 splitPlan（无 schedule / 无 team_fit 时为 undefined） */
  splitPlan?: DecisionCheckerSplitPlanDto | null;
  className?: string;
}

/** 右侧 · 决策检查器（BFF SSOT：`tripnara.decision_checker@v1`） */
export function PlanningWorkbenchDecisionChecker({
  tripId,
  decisionChecker,
  strip,
  solutionMatrix,
  relaxation,
  onPrimaryCta,
  onOpenFeasibility,
  onApplySplitPlan,
  onDiscussSplitWithNara,
  onViewSplitAlternatives,
  splitPlanSnapshotStale,
  splitPreviewPending = false,
  requestedTab,
  decisionSpaceMode = false,
  selectedOptionLetter = 'A',
  onConfirmSelectedOption,
  planningInterim,
  displayTimezone,
  splitPlan: splitPlanProp,
  className,
}: PlanningWorkbenchDecisionCheckerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');

  const dc = decisionChecker ?? {
    data: null,
    source: null,
    loading: false,
    awaitingEmbedded: false,
    refreshing: false,
    error: null,
    unavailable: false,
    reload: async () => {},
    refresh: async () => {},
  };

  const data = normalizeDecisionCheckerResponse(dc.data, tripId);
  const splitPlan = splitPlanProp ?? undefined;
  const fourthTabValue = splitPlan ? 'split' : 'counterfactual';
  const fourthTabLabel = splitPlan ? '分流' : '反事实';
  const hasAlternatives = data.counterfactual.scenarios.length > 0;
  const showAlternativesTab = Boolean(splitPlan && hasAlternatives);
  const tabState = {
    loading: dc.loading,
    unavailable: dc.unavailable,
    error: dc.error,
  };

  const primaryCtaType: DecisionStripCtaType = strip?.model?.primaryCta?.type ?? 'open_feasibility';
  const primaryCtaLabel =
    strip?.model?.primaryCta?.labelOverride?.trim() ||
    t(`decisionStrip.cta.${DECISION_STRIP_CTA_LABEL_KEY[primaryCtaType]}`, {
      defaultValue: '查看修复方案',
    });

  useEffect(() => {
    if (requestedTab) {
      if (requestedTab === 'counterfactual' && splitPlan) {
        setTab(showAlternativesTab ? 'alternatives' : 'split');
        return;
      }
      setTab(requestedTab);
    }
  }, [requestedTab, splitPlan, showAlternativesTab]);

  const actionContext = {
    onOpenFeasibility,
    onOpenEvidence: () => setTab('evidence'),
    onPrimaryCta: () => onPrimaryCta(primaryCtaType),
    onApplyRelaxation: (actionId: string) => {
      relaxation?.onToggleAction(actionId);
      onPrimaryCta(primaryCtaType);
    },
    onSelectOption: (optionId: string) => {
      solutionMatrix?.matrix.setSelectedOptionId(optionId);
      solutionMatrix?.matrix.setExpanded(true);
    },
    onOpenRepairPlan: () => onOpenFeasibility?.(),
    onApplySplitPlan,
    onDiscussWithNara: onDiscussSplitWithNara,
    onViewSplitAlternatives,
  };

  const handleViewRepair = () => {
    const cta = data.overview.repairPlan?.cta;
    if (runDecisionCheckerAction(cta, actionContext)) return;
    if (relaxation?.visible && relaxation.suggestions.length > 0) {
      onPrimaryCta(primaryCtaType);
      return;
    }
    onOpenFeasibility?.();
  };

  const handleSelectScenario = (scenarioId: string) => {
    const scenario = data.counterfactual.scenarios.find((s) => s.id === scenarioId);
    if (scenario?.action && runDecisionCheckerAction(scenario.action, actionContext)) return;
    if (relaxation?.suggestions.some((s) => s.actionId === scenarioId)) {
      relaxation.onToggleAction(scenarioId);
      onPrimaryCta(primaryCtaType);
      return;
    }
    solutionMatrix?.matrix.setSelectedOptionId(scenarioId);
    solutionMatrix?.matrix.setExpanded(true);
  };

  return (
    <div className={cn(workbenchDecisionShell, className)}>
      <div className={workbenchPanelHeader}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className={workbenchPanelTitle}>决策检查器</h2>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className={cn(workbenchDecisionCheckerTabList, 'mx-3 mt-2 w-auto justify-start border-b border-border/40 pb-0')}>
          {(['overview', 'evidence', 'impact'] as const).map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className={workbenchDecisionCheckerTabTrigger}
            >
              {value === 'overview' ? '概览' : value === 'evidence' ? '证据' : '影响'}
            </TabsTrigger>
          ))}
          <TabsTrigger value={fourthTabValue} className={workbenchDecisionCheckerTabTrigger}>
            {fourthTabLabel}
          </TabsTrigger>
          {showAlternativesTab ? (
            <TabsTrigger value="alternatives" className={workbenchDecisionCheckerTabTrigger}>
              备选
            </TabsTrigger>
          ) : null}
        </TabsList>

        <div className={cn('min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2', workbenchScrollable)}>
          {splitPlanSnapshotStale ? (
            <p className="mb-2 rounded-lg border border-gate-confirm-border/60 bg-gate-confirm/10 px-2.5 py-1.5 text-[10px] text-gate-confirm-foreground">
              分流方案快照与当前决策检查器版本不一致，请刷新后重试。
            </p>
          ) : null}
          <TabsContent value="overview" className="mt-0">
            <DecisionCheckerOverviewTab
              model={data.overview}
              isStale={data.isStale}
              staleReason={data.staleReason}
              {...tabState}
              awaitingEmbedded={dc.awaitingEmbedded}
              planningInterim={planningInterim}
              onViewEvidence={() => setTab('evidence')}
              onViewRepair={handleViewRepair}
              onExploreMore={() => solutionMatrix?.matrix.setExpanded(true)}
              primaryCtaLabel={primaryCtaLabel}
              showExploreMore={solutionMatrix?.matrix.model.visible}
              displayTimezone={displayTimezone}
            />
          </TabsContent>

          <TabsContent value="evidence" className="mt-0">
            <DecisionCheckerEvidenceTab model={data.evidence} displayTimezone={displayTimezone} {...tabState} />
          </TabsContent>

          <TabsContent value="impact" className="mt-0">
            <DecisionCheckerImpactTab
              model={data.impact}
              displayTimezone={displayTimezone}
              {...tabState}
              onViewRepair={handleViewRepair}
            />
          </TabsContent>

          {splitPlan ? (
            <TabsContent value="split" className="mt-0">
              <DecisionCheckerSplitTab
                model={splitPlan}
                splitPreviewPending={splitPreviewPending}
                displayTimezone={displayTimezone}
                {...tabState}
                actionContext={actionContext}
              />
            </TabsContent>
          ) : null}

          {showAlternativesTab ? (
            <TabsContent value="alternatives" className="mt-0">
              <DecisionCheckerCounterfactualTab
                model={data.counterfactual}
                displayTimezone={displayTimezone}
                {...tabState}
                onSelectScenario={handleSelectScenario}
              />
            </TabsContent>
          ) : null}

          <TabsContent value="counterfactual" className="mt-0">
            <DecisionCheckerCounterfactualTab
              model={data.counterfactual}
              displayTimezone={displayTimezone}
              {...tabState}
              onSelectScenario={handleSelectScenario}
            />
          </TabsContent>
        </div>
      </Tabs>

      {decisionSpaceMode && onConfirmSelectedOption ? (
        <div className="shrink-0 border-t border-border/60 bg-card/95 px-3 py-3">
          <Button
            className={cn('h-10 w-full rounded-lg text-xs', workbenchPrimaryAction)}
            onClick={onConfirmSelectedOption}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            确认方案 {selectedOptionLetter} 并生成草案
          </Button>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            确认后将更新相关日程，并同步至团队视图。
          </p>
        </div>
      ) : null}
    </div>
  );
}
