import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatEvidenceFreshness } from '@/lib/decision-problem-display.util';
import type { DecisionContextFact } from '@/lib/decision-context-capsule.util';
import type { PlanningDecisionBasis } from '@/dto/frontend-planning-decision-basis.types';
import type { PlanningDecisionPackOption } from '@/dto/frontend-planning-decision-pack.types';
import type { DecisionProposalOptionView } from '@/lib/decision-proposal-option-view.util';
import {
  decisionProposalViewsFromPackOptions,
  matchPackOptionIdForAction,
  resolvePackOptionActionId,
} from '@/lib/decision-proposal-option-view.util';
import { useDecisionBasis } from '@/components/plan-studio/workbench/arrange-itinerary/useDecisionBasis';
import { DecisionBasisMetricsGrid } from './DecisionBasisMetricsGrid';
import { DecisionProposalOptionsRow } from './DecisionProposalOptionsRow';
import { DecisionWhatHappenedBanner } from './DecisionWhatHappenedBanner';
import { DecisionGuardianWarningBanner } from '@/components/decision-problems/decision-space/DecisionGuardianWarningBanner';

export interface DecisionExecutionProposalPanelProps {
  tripId?: string;
  conflictId?: string | null;
  proposalId?: string | null;
  /** 父级预取 basis 时传入，跳过内部 fetch */
  basis?: PlanningDecisionBasis | null;
  /** 客户端兜底 — BFF 无数据时使用 */
  whatHappened?: string | null;
  whatHappenedTitle?: string;
  /** guardianCausalStoryView.headline — Abu 安全提示 */
  guardianWarningHeadline?: string | null;
  guardianWarningContextLabel?: string | null;
  guardianPrimaryEnforcement?: import('@/types/decision-problem').PrimaryEnforcement | string | null;
  basisFacts?: DecisionContextFact[];
  basisSubtitle?: string;
  /** proposal.decisionPack.options[] — 方案卡 SSOT */
  packOptions?: PlanningDecisionPackOption[];
  /** 无 packOptions 时客户端 / actions 兜底 */
  options?: DecisionProposalOptionView[];
  selectedOptionId?: string | null;
  onSelectOption?: (optionId: string) => void;
  optionsEmptyMessage?: string;
  compact?: boolean;
  className?: string;
}

/**
 * 决策执行空间 · 中栏主视图
 * 顺序：Abu 提示 → 发生了什么 → 决策依据 → 方案卡 A/B/C
 */
export function DecisionExecutionProposalPanel({
  tripId,
  conflictId,
  proposalId,
  basis: basisProp,
  whatHappened,
  whatHappenedTitle,
  guardianWarningHeadline,
  guardianWarningContextLabel,
  guardianPrimaryEnforcement,
  basisFacts = [],
  basisSubtitle,
  packOptions = [],
  options: optionsProp = [],
  selectedOptionId,
  onSelectOption,
  optionsEmptyMessage,
  compact = false,
  className,
}: DecisionExecutionProposalPanelProps) {
  const shouldFetch =
    Boolean(tripId) &&
    basisProp === undefined &&
    !(whatHappened?.trim() && basisFacts.length > 0);
  const basisQuery = useDecisionBasis(
    tripId ?? '',
    { conflictId, proposalId },
    shouldFetch,
  );

  const optionViews = useMemo(
    () =>
      packOptions.length > 0
        ? decisionProposalViewsFromPackOptions(packOptions)
        : optionsProp,
    [packOptions, optionsProp],
  );

  const selectedCardId = useMemo(() => {
    if (!packOptions.length) return selectedOptionId;
    return matchPackOptionIdForAction(packOptions, selectedOptionId) ?? selectedOptionId;
  }, [packOptions, selectedOptionId]);

  const handleSelectOption = (optionId: string) => {
    if (!onSelectOption) return;
    const packOption = packOptions.find((option) => option.id === optionId);
    onSelectOption(packOption ? resolvePackOptionActionId(packOption) : optionId);
  };

  const basis = basisProp ?? basisQuery.data ?? null;
  const usingBffFields = (basis?.contextFields?.length ?? 0) > 0;
  const narrative =
    basis?.whatHappened.narrative?.trim() ||
    whatHappened?.trim() ||
    '';
  const headline = basis?.whatHappened.headline?.trim() || whatHappenedTitle || '发生了什么？';
  const contextFields = basis?.contextFields ?? [];
  const optionCount = basis?.optionCount ?? optionViews.length;
  const dataValidUntilLabel =
    formatEvidenceFreshness(basis?.dataValidUntil) ?? basis?.dataValidUntil;

  const showWhatHappenedBanner = Boolean(narrative);
  const showProposalCards = optionViews.length > 0 || (optionCount ?? 0) > 0;
  const basisMetricsLoading =
    basisQuery.isLoading &&
    !contextFields.length &&
    !basisFacts.length &&
    (basisProp === undefined || shouldFetch);

  return (
    <div className={cn(compact ? 'space-y-2' : 'space-y-3', className)}>
      <DecisionGuardianWarningBanner
        headline={guardianWarningHeadline}
        contextLabel={guardianWarningContextLabel}
        primaryEnforcement={guardianPrimaryEnforcement}
      />
      {showWhatHappenedBanner ? (
        <DecisionWhatHappenedBanner text={narrative} title={headline} compact={compact} />
      ) : null}

      <DecisionBasisMetricsGrid
        fields={contextFields}
        facts={usingBffFields ? [] : basisFacts}
        subtitle={basisSubtitle}
        dataValidUntil={dataValidUntilLabel}
        updatedAt={basis?.updatedAt}
        optionCount={optionCount}
        basisLoading={basisMetricsLoading}
        basisFetching={basisQuery.isFetching}
        basisError={
          shouldFetch && basisQuery.isError && !usingBffFields
            ? '决策依据接口暂不可用，已展示客户端推断'
            : undefined
        }
        onRefreshBasis={shouldFetch ? () => void basisQuery.refetch() : undefined}
        compact={compact}
      />

      {showProposalCards ? (
        <DecisionProposalOptionsRow
          options={optionViews}
          selectedOptionId={selectedCardId}
          onSelect={onSelectOption ? handleSelectOption : undefined}
          optionCount={optionCount}
          emptyMessage={optionsEmptyMessage}
          compact={compact}
        />
      ) : null}
    </div>
  );
}

export { DecisionBasisMetricsGrid } from './DecisionBasisMetricsGrid';
export { DecisionProposalOptionCard } from './DecisionProposalOptionCard';
export { DecisionProposalOptionsRow } from './DecisionProposalOptionsRow';
export { DecisionWhatHappenedBanner } from './DecisionWhatHappenedBanner';
