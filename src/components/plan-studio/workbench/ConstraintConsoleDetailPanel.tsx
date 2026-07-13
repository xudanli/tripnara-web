import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HardConstraintMetadataCard } from './HardConstraintMetadataCard';
import { ConstraintImpactPreviewPanel } from './ConstraintImpactPreviewPanel';
import { ContractSectionDetailPanel } from './ConstraintContractBlocks';
import { hasAutomationCatalogSummary } from '@/components/trip-automation/AutomationCatalogSummaryPanel';
import { DestinationRulesSectionPanel } from './DestinationRulesSectionPanel';
import { TravelGoalsDetailPanel } from './TravelGoalsSection';
import type { ConstraintImpactPreview } from './constraint-console-types';
import type { ConstraintPreviewSource } from '@/hooks/useConstraintImpactPreview';
import type { HardConstraintMetadata } from '@/lib/constraint-metadata.util';
import { selectionIdToSectionKey } from '@/lib/trip-constraints-contract.util';
import { TRAVEL_GOALS_SECTION_ID } from '@/lib/travel-goals.util';
import type { TravelGoalDimension } from '@/types/travel-decision-contract';
import type { TripConstraintsContract, PatchTripConstraintsContractDto } from '@/types/trip-constraints';
import type { ConstraintListEntry } from './constraint-console-types';
import { SoftConstraintDetailCard } from './SoftConstraintDetailCard';
import type { ConstraintEntryScopeContext } from '@/lib/constraint-entry-scope-context.util';
import { ConstraintEntryScopeCard } from './ConstraintEntryScopeCard';
import { ConstraintAssessmentSummary } from './ConstraintAssessmentLaneBadges';

export interface ConstraintConsoleDetailPanelProps {
  selectedId: string | null;
  tripId?: string;
  contract?: TripConstraintsContract | null;
  automationSummary?: import('@/api/travel-status.types').TravelStatusAutomation | null;
  travelGoalOrderedIds: TravelGoalDimension[];
  onTravelGoalReorder: (id: TravelGoalDimension, direction: 'up' | 'down') => void;
  travelGoalsSaving?: boolean;
  hardMetadata?: HardConstraintMetadata | null;
  hardConstraintLabel?: string;
  hardEntry?: ConstraintListEntry | null;
  softEntry?: ConstraintListEntry | null;
  softScopeContext?: ConstraintEntryScopeContext | null;
  hardScopeContext?: ConstraintEntryScopeContext | null;
  onSoftPriorityChange?: (id: string, sliderValue: number) => void;
  preview: ConstraintImpactPreview | null;
  previewLoading?: boolean;
  previewSource?: ConstraintPreviewSource;
  previewError?: string | null;
  onPreviewRetry?: () => void;
  onRunConstraintCheck?: () => void;
  contractEditable?: boolean;
  contractSaving?: boolean;
  onPatchContract?: (patch: PatchTripConstraintsContractDto) => void | Promise<void>;
  onOpenCollaborationCenter?: () => void;
  destinationRuleItems?: import('./constraint-console-types').ConstraintListEntry[];
  onSelectDestinationRule?: (id: string) => void;
  onOpenFeasibilityReport?: () => void;
  /** 抽屉模式 · 右栏顶部内联编辑区 */
  inlineEditor?: ReactNode;
  /** 仅展示影响预览（编辑区在独立中栏） */
  previewOnly?: boolean;
  previewEmptyHint?: string | null;
  /** 只读 / 官方规则等不可编辑项不展示影响预览 */
  showImpactPreview?: boolean;
  className?: string;
}

/** 右栏 · contract 区块 / 硬约束元数据 + 影响预览 */
export function ConstraintConsoleDetailPanel({
  selectedId,
  tripId,
  contract,
  automationSummary,
  travelGoalOrderedIds,
  onTravelGoalReorder,
  travelGoalsSaving,
  hardMetadata,
  hardConstraintLabel,
  hardEntry,
  softEntry,
  softScopeContext,
  hardScopeContext,
  onSoftPriorityChange,
  preview,
  previewLoading,
  previewSource,
  previewError,
  onPreviewRetry,
  onRunConstraintCheck,
  contractEditable,
  contractSaving,
  onPatchContract,
  onOpenCollaborationCenter,
  destinationRuleItems = [],
  onSelectDestinationRule,
  onOpenFeasibilityReport,
  inlineEditor,
  previewOnly = false,
  previewEmptyHint,
  showImpactPreview = true,
  className,
}: ConstraintConsoleDetailPanelProps) {
  const sectionKey = selectionIdToSectionKey(selectedId);
  const showTravelGoals = selectedId === TRAVEL_GOALS_SECTION_ID;
  const showContractSection =
    sectionKey != null &&
    sectionKey !== 'travel_objectives' &&
    ['team_members', 'change_strategy', 'automation', 'conflicts_and_impact'].includes(sectionKey);
  const showDestinationRulesSection = sectionKey === 'readonly_official';
  const showWorldStateSection = sectionKey === 'readonly_world';
  const showSoftDetail = Boolean(
    softEntry?.kind === 'soft' &&
      !showTravelGoals &&
      !showContractSection &&
      !showDestinationRulesSection &&
      !showWorldStateSection,
  );
  const showHardMeta = Boolean(
    hardMetadata &&
      hardConstraintLabel &&
      !showSoftDetail &&
      !showTravelGoals &&
      !showContractSection &&
      !showDestinationRulesSection &&
      !showWorldStateSection,
  );

  if (showTravelGoals) {
    return (
      <TravelGoalsDetailPanel
        orderedIds={travelGoalOrderedIds}
        displayPrinciples={contract?.objectives?.displayPrinciples ?? contract?.displayPrinciples}
        compiledLegacy={contract?.compiledWeights?.legacy}
        onReorder={onTravelGoalReorder}
        saving={travelGoalsSaving}
        className={cn('min-h-0', className)}
      />
    );
  }

  if (showDestinationRulesSection) {
    return (
      <DestinationRulesSectionPanel
        items={destinationRuleItems}
        onSelectRule={onSelectDestinationRule}
        onOpenFeasibilityReport={onOpenFeasibilityReport}
        onRunConstraintCheck={onRunConstraintCheck}
        className={cn('min-h-0 border-l border-border/60', className)}
      />
    );
  }

  if (showContractSection && sectionKey === 'automation' && !hasAutomationCatalogSummary(automationSummary)) {
    return null;
  }

  if (showContractSection && sectionKey) {
    return (
      <ContractSectionDetailPanel
        sectionKey={sectionKey}
        contract={contract}
        tripId={tripId}
        automationSummary={automationSummary}
        onRunCheck={sectionKey === 'conflicts_and_impact' ? onRunConstraintCheck : undefined}
        contractEditable={contractEditable}
        contractSaving={contractSaving}
        onPatchContract={onPatchContract}
        onOpenCollaborationCenter={onOpenCollaborationCenter}
        className={cn('min-h-0 border-l border-border/60', className)}
      />
    );
  }

  if (previewOnly) {
    if (!showImpactPreview) return null;
    return (
      <ConstraintImpactPreviewPanel
        preview={preview}
        loading={previewLoading}
        source={previewSource}
        error={previewError}
        onRetry={onPreviewRetry}
        emptyHint={previewEmptyHint}
        onOpenFeasibilityReport={onOpenFeasibilityReport}
        className={cn('min-h-0 flex-1 border-l border-border/60', className)}
      />
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-col border-l border-border/60', className)}>
      {inlineEditor ? (
        <div className="max-h-[min(52vh,420px)] shrink-0 overflow-y-auto border-b border-border/60">
          {inlineEditor}
        </div>
      ) : (
      <div className="mx-auto w-full max-w-xl">
      {showSoftDetail && softEntry ? (
        <div className="shrink-0 border-b border-border/60">
          <SoftConstraintDetailCard
            entry={softEntry}
            scopeContext={softScopeContext}
            onPriorityChange={onSoftPriorityChange}
          />
        </div>
      ) : null}
      {showHardMeta && hardMetadata && hardConstraintLabel ? (
        <div className="shrink-0 border-b border-border/60 p-4">
          <HardConstraintMetadataCard
            metadata={hardMetadata}
            constraintLabel={hardConstraintLabel}
          />
          {hardEntry?.assessmentAggregateStatus ? (
            <ConstraintAssessmentSummary
              contractRequirement={hardEntry.contractRequirement ?? hardEntry.metadata?.ruleLabel}
              aggregateLabel={hardEntry.assessmentAggregateLabel}
              aggregateTone={hardEntry.assessmentTone}
              laneBadges={hardEntry.assessmentLaneBadges}
              className="mt-3 rounded-lg border border-border/50 bg-muted/10 p-3"
            />
          ) : null}
          <ConstraintEntryScopeCard scope={hardScopeContext} className="mt-3" />
        </div>
      ) : null}
      </div>
      )}
      {showImpactPreview ? (
        <ConstraintImpactPreviewPanel
          preview={preview}
          loading={previewLoading}
          source={previewSource}
          error={previewError}
          onRetry={onPreviewRetry}
          onOpenFeasibilityReport={onOpenFeasibilityReport}
          className="min-h-0 flex-1"
        />
      ) : null}
    </div>
  );
}
