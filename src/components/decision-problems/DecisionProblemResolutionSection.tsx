import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIsoDateTimesInDisplayText } from '@/components/plan-studio/workbench/workbench-format.util';
import { decisionActionDisplayTitle, resolveAppliedDecisionActionLabel } from '@/lib/decision-action-display.util';
import { DecisionActionsPanel } from '@/components/decision-problems/DecisionActionsPanel';
import { DecisionCollaborativeSubTasksPanel } from '@/components/decision-problems/DecisionCollaborativeSubTasksPanel';
import { DecisionSpaceActionPreviewPanel } from '@/components/decision-problems/DecisionSpaceActionPreviewPanel';
import { DecisionBeforeAfterPanel } from '@/components/decision-problems/DecisionBeforeAfterPanel';
import { DecisionSpaceOptionsComparisonTable } from '@/components/decision-problems/DecisionSpaceOptionsComparisonTable';
import { DecisionSpaceReservationEvidencePanel } from '@/components/decision-problems/DecisionSpaceReservationEvidencePanel';
import { DecisionSuppressedActionsCollapsible } from '@/components/decision-problems/DecisionSuppressedActionsCollapsible';
import { DecisionWriteBackStepsPanel } from '@/components/decision-problems/DecisionWriteBackStepsPanel';
import { DecisionValidityStrip } from '@/components/decision-problems/DecisionValidityStrip';
import { DecisionExecutionProposalPanel } from '@/components/decision-problems/decision-execution-proposal/DecisionExecutionProposalPanel';
import { useDecisionCollaborativeSubTasks } from '@/hooks/useDecisionCollaborativeSubTasks';
import type { UseDecisionProblemActionsResult } from '@/hooks/useDecisionProblemActions';
import {
  buildDecisionSpaceActionPreviewView,
  actionPreviewHasIncrementalContent,
} from '@/lib/decision-space-action-preview.util';
import { resolveDecisionSpaceProblemTemplate } from '@/lib/decision-space-problem-template.util';
import {
  previewCollaborativeFollowUps,
  type StructuredSuggestedFollowUp,
} from '@/lib/decision-collaborative-sub-task.util';
import {
  resolveDecisionSpaceReservationEvidenceContext,
  shouldShowDecisionSpaceReservationEvidence,
} from '@/lib/decision-space-reservation-evidence.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { DecisionAction } from '@/generated/unified-decision-contracts';
import type { Collaborator, PersonaAlert, TripDetail } from '@/types/trip';
import type { DecisionOption, DecisionProblemDetail, DecisionProblemSummary } from '@/types/decision-problem';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import type { PlanningDecisionPackOption } from '@/dto/frontend-planning-decision-pack.types';
import type { DecisionContextFact } from '@/lib/decision-context-capsule.util';
import { decisionProposalViewsFromActions } from '@/lib/decision-proposal-option-view.util';

export interface DecisionProblemResolutionSectionProps {
  model: Pick<
    UseDecisionProblemActionsResult,
    | 'actions'
    | 'suppressedActions'
    | 'selectedAction'
    | 'selectedActionPreview'
    | 'previewingActionId'
    | 'previewAction'
    | 'ctaPhase'
    | 'submitHint'
    | 'selectedActionId'
    | 'resolutionId'
    | 'actionPlanId'
    | 'subTaskProblemId'
    | 'suggestedSubTasks'
    | 'acknowledgementRequired'
    | 'acknowledgement'
    | 'acknowledgementsComplete'
    | 'toggleAcknowledgement'
    | 'selectAction'
    | 'suggestedFollowUps'
    | 'structuredSuggestedFollowUps'
    | 'appliedActionLabel'
    | 'appliedActionSummary'
  >;
  tripId: string;
  problemId?: string | null;
  trip?: TripDetail | null;
  problem?: DecisionProblemSummary | null;
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  conflict?: PlanningConflictItem | null;
  conflicts?: PlanningConflictItem[];
  options?: DecisionOption[];
  personaAlerts?: PersonaAlert[];
  collaborators?: Collaborator[] | null;
  collaboratorsLoading?: boolean;
  displayTimezone?: string;
  className?: string;
  emptyMessage?: string;
  onReservationEvidenceSaved?: () => void;
  /** 子任务 resolution 失步时刷新 problem detail */
  onRefreshDetail?: () => void | Promise<void>;
  /** 设计稿布局：发生了什么 + 决策依据 + A/B/C 方案卡 */
  proposalLayout?: boolean;
  whatHappened?: string | null;
  basisFacts?: DecisionContextFact[];
  conflictId?: string | null;
  proposalId?: string | null;
  /** Tier-2 inspector.decisionBasis — 跳过独立 decision-basis 请求 */
  inspectorBasis?: import('@/dto/frontend-planning-decision-basis.types').PlanningDecisionBasis | null;
  /** proposal.decisionPack.options[] — 方案卡 SSOT */
  packOptions?: PlanningDecisionPackOption[];
  /** 一屏紧凑布局：减少间距、折叠次要块 */
  compactLayout?: boolean;
  /** guardianCausalStoryView.headline — Abu 安全提示 */
  guardianWarningHeadline?: string | null;
  guardianWarningContextLabel?: string | null;
  guardianPrimaryEnforcement?: import('@/types/decision-problem').PrimaryEnforcement | string | null;
}

/** resolutions + apply 统一写路径 UI（行动区） */
export function DecisionProblemResolutionSection({
  model,
  tripId,
  problemId,
  trip,
  problem,
  detail,
  conflict,
  conflicts,
  options = [],
  personaAlerts,
  collaborators,
  collaboratorsLoading,
  displayTimezone,
  className,
  emptyMessage,
  onReservationEvidenceSaved,
  onRefreshDetail,
  proposalLayout = false,
  whatHappened,
  basisFacts = [],
  conflictId,
  proposalId,
  inspectorBasis,
  packOptions = [],
  compactLayout = false,
  guardianWarningHeadline,
  guardianWarningContextLabel,
  guardianPrimaryEnforcement,
}: DecisionProblemResolutionSectionProps) {
  const {
    actions,
    suppressedActions,
    selectedAction,
    selectedActionPreview,
    previewingActionId,
    previewAction,
    ctaPhase,
    submitHint,
    selectedActionId,
    resolutionId,
    actionPlanId,
    subTaskProblemId,
    suggestedSubTasks,
    acknowledgementRequired,
    acknowledgement,
    toggleAcknowledgement,
    selectAction,
    suggestedFollowUps,
    structuredSuggestedFollowUps,
    appliedActionLabel,
    appliedActionSummary,
  } = model;

  const followUpSuggestions = useMemo((): StructuredSuggestedFollowUp[] => {
    if (structuredSuggestedFollowUps.length) return structuredSuggestedFollowUps;
    if (suggestedFollowUps.length) {
      return suggestedFollowUps.map((title) => ({ kind: 'OTHER', title }));
    }
    return previewCollaborativeFollowUps(
      problem?.semanticKey ?? detail?.semanticKey,
    ).items.map((item) => ({
      kind: item.kind,
      title: item.title,
    }));
  }, [
    structuredSuggestedFollowUps,
    suggestedFollowUps,
    problem?.semanticKey,
    detail?.semanticKey,
  ]);

  const template = resolveDecisionSpaceProblemTemplate({ problem, detail, conflict });

  const matchedOptionIndex = useMemo(
    () => options.findIndex((option) => option.id === selectedActionId),
    [options, selectedActionId],
  );
  const matchedOption = matchedOptionIndex >= 0 ? options[matchedOptionIndex] : null;

  const previewView = useMemo(
    () =>
      buildDecisionSpaceActionPreviewView({
        preview: selectedActionPreview,
        action: selectedAction,
        matchedOption,
        optionIndex: matchedOptionIndex >= 0 ? matchedOptionIndex : 0,
        displayTimezone,
      }),
    [selectedActionPreview, selectedAction, matchedOption, matchedOptionIndex, displayTimezone],
  );

  const previewLoading = Boolean(selectedAction && previewingActionId === selectedAction.actionId);
  const canRequestPreview = Boolean(selectedAction?.allowed && !selectedActionPreview);
  const showActionPreviewPanel =
    previewLoading || actionPreviewHasIncrementalContent(previewView) || canRequestPreview;

  const reservationContext = resolveDecisionSpaceReservationEvidenceContext({
    trip,
    problem,
    detail,
    conflict,
    conflicts,
  });
  const showReservationEvidence =
    shouldShowDecisionSpaceReservationEvidence({
      templateSupports: template.supportsReservationEvidence,
      selectedAction,
    }) && reservationContext != null;

  const collaborativeSubTasks = useDecisionCollaborativeSubTasks({
    tripId,
    problemId: subTaskProblemId ?? problemId,
    resolutionId,
    actionPlanId,
    enabled: Boolean(resolutionId && (subTaskProblemId ?? problemId)),
    onResolutionStale: onRefreshDetail,
  });

  if (ctaPhase === 'done') {
    const actionTitle = resolveAppliedDecisionActionLabel({
      selectedAction,
      actions,
      resolutionSelectedActionId:
        detail?.resolution?.selectedActionId ?? selectedActionId ?? undefined,
      cachedTitle: appliedActionLabel,
    });
    const actionSummary =
      appliedActionSummary ??
      previewView?.summary ??
      formatIsoDateTimesInDisplayText(
        selectedAction?.summary ?? selectedAction?.expectedImpact,
        displayTimezone,
      );

    return (
      <div className={cn('space-y-3', className)}>
        <DecisionWriteBackStepsPanel
          phase="done"
          itineraryDiff={previewView?.itineraryDiff}
          memberNotifyCount={detail?.memberImpacts?.length}
        />
        <div className="flex items-start gap-2 rounded-xl border border-gate-allow-border/60 bg-gate-allow/8 px-3 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gate-allow-foreground" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">决策已应用到行程</p>
            {actionTitle ? (
              <p className="mt-1.5 text-xs font-medium text-foreground">{actionTitle}</p>
            ) : null}
            {actionSummary ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {actionSummary}
              </p>
            ) : actionTitle ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                已写入行程，可在日程中查看变更。
              </p>
            ) : null}
          </div>
        </div>
        {resolutionId && (suggestedSubTasks.length > 0 || collaborativeSubTasks.items.some((i) => i.status !== 'cancelled')) ? (
          <DecisionCollaborativeSubTasksPanel
            model={collaborativeSubTasks}
            resolutionId={resolutionId}
            collaborators={collaborators}
            autoSuggestedCount={suggestedSubTasks.length}
            readOnlyCreate
          />
        ) : null}
      </div>
    );
  }

  if (ctaPhase === 'apply') {
    const actionTitle = selectedAction ? decisionActionDisplayTitle(selectedAction) : '所选方案';
    const actionSummary =
      previewView?.summary ??
      formatIsoDateTimesInDisplayText(selectedAction?.summary ?? selectedAction?.expectedImpact, displayTimezone);

    return (
      <div className={cn('space-y-3', className)}>
        <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-3">
          <p className="text-xs font-semibold text-foreground">结论已提交</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            「{actionTitle}」{actionSummary ? ` — ${actionSummary}` : ''}
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            时间轴尚未变更，请在底栏点击「应用到行程」。
          </p>
        </div>
        {resolutionId ? (
          <DecisionCollaborativeSubTasksPanel
            model={collaborativeSubTasks}
            resolutionId={resolutionId}
            collaborators={collaborators}
            suggestedFollowUps={followUpSuggestions}
            optional
          />
        ) : null}
      </div>
    );
  }

  const hasTradeoffComparison = useMemo(
    () => options.some((option) => (option.tradeoffs?.length ?? 0) > 0),
    [options],
  );

  const fallbackOptionViews = useMemo(
    () => decisionProposalViewsFromActions(actions, options),
    [actions, options],
  );

  return (
    <div className={cn(compactLayout ? 'space-y-2' : 'space-y-3', className)}>
      {proposalLayout ? (
        <>
          <DecisionExecutionProposalPanel
            tripId={tripId}
            conflictId={conflictId}
            proposalId={proposalId}
            basis={inspectorBasis}
            whatHappened={whatHappened}
            guardianWarningHeadline={guardianWarningHeadline}
            guardianWarningContextLabel={guardianWarningContextLabel}
            guardianPrimaryEnforcement={guardianPrimaryEnforcement}
            basisFacts={basisFacts}
            packOptions={packOptions}
            options={packOptions.length > 0 ? undefined : fallbackOptionViews}
            selectedOptionId={selectedActionId}
            onSelectOption={(optionId) => selectAction(optionId)}
            optionsEmptyMessage={
              packOptions.length > 0
                ? emptyMessage
                : emptyMessage ?? '当前决策问题暂无可选方案；请确认后端已返回 detail.actions[]。'
            }
            compact={compactLayout}
          />
          {!compactLayout ? (
            <DecisionValidityStrip
              validUntil={problem?.evidenceValidUntil}
              dependencyHint="当前方案依赖实时道路与预约数据；条件失效时系统会重新打开该决策。"
            />
          ) : null}
        </>
      ) : (
        <>
          <DecisionValidityStrip
            validUntil={problem?.evidenceValidUntil}
            dependencyHint="当前方案依赖实时道路与预约数据；条件失效时系统会重新打开该决策。"
          />
          <DecisionActionsPanel
            actions={actions}
            selectedActionId={selectedActionId}
            displayTimezone={displayTimezone}
            emptyMessage={emptyMessage}
            sectionTitle="可选方案"
            options={options}
            layout="horizontal-scroll"
            onSelect={(action: DecisionAction) => selectAction(action.actionId)}
          />
        </>
      )}
      {hasTradeoffComparison && options.length > 1 && !compactLayout ? (
        <DecisionSpaceOptionsComparisonTable
          options={options}
          selectedOptionId={selectedActionId}
        />
      ) : hasTradeoffComparison && !compactLayout ? (
        <DecisionBeforeAfterPanel options={options} selectedOptionId={selectedActionId} />
      ) : null}
      {showActionPreviewPanel && !compactLayout ? (
        <DecisionSpaceActionPreviewPanel
          view={previewView}
          loading={previewLoading}
          canRequestPreview={canRequestPreview}
          onRequestPreview={
            selectedAction
              ? () => {
                  void previewAction(selectedAction);
                }
              : undefined
          }
        />
      ) : null}
      {showReservationEvidence && reservationContext ? (
        <DecisionSpaceReservationEvidencePanel
          tripId={tripId}
          trip={trip}
          context={reservationContext}
          onSaved={onReservationEvidenceSaved}
        />
      ) : null}
      <DecisionSuppressedActionsCollapsible actions={suppressedActions} />
      {submitHint && ctaPhase === 'select_action' ? (
        <p className="px-0.5 text-[11px] text-muted-foreground">{submitHint}</p>
      ) : null}
    </div>
  );
}
