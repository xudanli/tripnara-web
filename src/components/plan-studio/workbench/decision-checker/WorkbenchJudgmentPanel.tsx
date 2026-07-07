import { ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DecisionCheckerPlanningInterim } from '@/lib/decision-checker-interim.util';
import { buildDecisionCheckerImpactPreviewRows } from '@/lib/decision-checker-overview.util';
import type {
  DecisionCheckerEvidenceDto,
  DecisionCheckerImpactDto,
  DecisionCheckerOverviewDto,
} from '@/types/decision-checker';
import {
  DecisionCheckerAiBox,
  DecisionCheckerBadge,
  DecisionCheckerEvidencePreview,
  DecisionCheckerImpactPreview,
  formatDecisionCheckerText,
} from './decision-checker-ui';
import { refreshRoadClassTransportMessage } from '@/lib/trip-constraints.adapter';
import { WorkbenchGateStatusBanner } from '../WorkbenchGateStatusBanner';
import {
  resolveDecisionCheckerOverviewGateMessage,
  resolveDecisionCheckerOverviewGateStatus,
} from '@/lib/decision-checker-gate.util';
import { workbenchCard, workbenchLinkClass, workbenchPrimaryAction } from '../workbench-ui';

export interface WorkbenchJudgmentPanelProps {
  model: DecisionCheckerOverviewDto;
  evidence?: DecisionCheckerEvidenceDto;
  impact?: DecisionCheckerImpactDto;
  planningInterim?: DecisionCheckerPlanningInterim | null;
  displayTimezone?: string;
  maxSegmentDistanceKm?: number | null;
  scheduleDayScoped?: boolean;
  scheduleDayLabel?: string;
  solutionCount?: number;
  onViewEvidence?: () => void;
  onViewImpact?: () => void;
  onOpenDecisionSpace?: () => void;
}

/** 工作台 · 判断 Tab（不含方案卡，方案在决策空间） */
export function WorkbenchJudgmentPanel({
  model,
  evidence,
  impact,
  planningInterim,
  displayTimezone,
  maxSegmentDistanceKm,
  scheduleDayScoped = false,
  scheduleDayLabel,
  solutionCount = 0,
  onViewEvidence,
  onViewImpact,
  onOpenDecisionSpace,
}: WorkbenchJudgmentPanelProps) {
  const { conflict, aiSuggestion } = model;
  const primaryConflict = conflict?.primary;
  const judgmentExplanation = evidence?.judgmentExplanation?.trim();

  const primaryConflictMessage = primaryConflict?.message
    ? refreshRoadClassTransportMessage(
        formatDecisionCheckerText(primaryConflict.message, displayTimezone),
        maxSegmentDistanceKm,
      )
    : null;

  const headline =
    aiSuggestion?.text?.trim() ||
    planningInterim?.verdictHeadline?.trim() ||
    primaryConflict?.title ||
    planningInterim?.topConflictTitle;

  const triggerReason =
    judgmentExplanation ||
    primaryConflictMessage ||
    planningInterim?.topConflictMessage?.trim() ||
    primaryConflict?.title;

  const impactRows = impact ? buildDecisionCheckerImpactPreviewRows(impact) : [];
  const evidenceCount = evidence?.items?.length ?? 0;

  return (
    <div className="space-y-3">
      {scheduleDayLabel ? (
        <p className="text-[11px] text-muted-foreground">{scheduleDayLabel}</p>
      ) : null}

      <WorkbenchGateStatusBanner
        status={resolveDecisionCheckerOverviewGateStatus(model)}
        message={resolveDecisionCheckerOverviewGateMessage(model)}
      />

      {headline ? (
        <section className={cn(workbenchCard, 'p-3')}>
          <h3 className="text-[13px] font-semibold text-foreground">系统判断</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{headline}</p>
          {triggerReason && triggerReason !== headline ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/90">触发原因：</span>
              {triggerReason}
            </p>
          ) : null}
          {primaryConflict?.severity === 'hard' ? (
            <div className="mt-2">
              <DecisionCheckerBadge tone="danger">硬冲突</DecisionCheckerBadge>
            </div>
          ) : primaryConflict ? (
            <div className="mt-2">
              <DecisionCheckerBadge tone="warning">建议调整</DecisionCheckerBadge>
            </div>
          ) : null}
        </section>
      ) : null}

      {!scheduleDayScoped ? (
        <p className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          方案对比与确认请在<strong className="font-medium text-foreground">决策空间</strong>
          完成；此处说明为何需要决定，以及依据与影响范围。
        </p>
      ) : null}

      {evidenceCount > 0 ? (
        <DecisionCheckerEvidencePreview
          items={evidence?.items}
          displayTimezone={displayTimezone}
          onViewAll={onViewEvidence}
        />
      ) : null}

      {impactRows.length > 0 ? (
        <DecisionCheckerImpactPreview
          rows={impactRows}
          displayTimezone={displayTimezone}
          onViewAll={onViewImpact}
        />
      ) : null}

      {aiSuggestion?.text && headline !== aiSuggestion.text ? (
        <DecisionCheckerAiBox>
          <p className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            AI 解读
          </p>
          <p className="mt-1 text-muted-foreground">{aiSuggestion.text}</p>
        </DecisionCheckerAiBox>
      ) : null}

      {onOpenDecisionSpace ? (
        <Button
          type="button"
          className={cn('h-10 w-full rounded-lg text-xs', workbenchPrimaryAction)}
          onClick={onOpenDecisionSpace}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          查看解决方案{solutionCount > 0 ? ` (${solutionCount})` : ''}
        </Button>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {onViewEvidence && evidenceCount > 0 ? (
          <button
            type="button"
            onClick={onViewEvidence}
            className={cn('inline-flex items-center gap-0.5 text-xs', workbenchLinkClass)}
          >
            查看完整依据
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onViewImpact && impactRows.length > 0 ? (
          <button
            type="button"
            onClick={onViewImpact}
            className={cn('inline-flex items-center gap-0.5 text-xs', workbenchLinkClass)}
          >
            查看完整影响
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
