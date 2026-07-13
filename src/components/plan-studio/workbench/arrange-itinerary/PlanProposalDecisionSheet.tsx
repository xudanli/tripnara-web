import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PlanProposal } from '@/types/arrange-itinerary';
import type {
  PlanningDecisionDiagnostic,
  PlanningDecisionExecutionStep,
} from '@/dto/frontend-planning-decision-pack.types';
import {
  getRecommendedOption,
  pickRecommendedOption,
  mergePackDiagnosticsWithTripConflicts,
  isTripConflictsOption,
} from '@/dto/frontend-arrange-itinerary-api-client';
import type { TripConflictDiagnosticInput } from '@/dto/frontend-planning-decision-card.util';
import { DecisionExecutionProposalPanel } from '@/components/decision-problems/decision-execution-proposal/DecisionExecutionProposalPanel';
import { DecisionValidityStrip } from '@/components/decision-problems/DecisionValidityStrip';
import { DecisionWriteBackStepsPanel } from '@/components/decision-problems/DecisionWriteBackStepsPanel';
import type { ArrangeLodgingCoverageSummary } from '@/lib/arrange-itinerary-lodging-coverage.util';
import {
  workbenchAttractionExploreAiBox,
  workbenchConflictSurface,
  workbenchDecisionCheckerBadgeClass,
  workbenchPrimaryAction,
  workbenchScrollable,
} from '../workbench-ui';

const INTENT_LABELS: Record<string, string> = {
  PLACE_CANDIDATE: '放入候选景点',
  ADD_ITEM: '添加活动',
  INSERT_REST_GAP: '插入空档',
  AUTO_ARRANGE: '自动编排',
  FILL_GAP: '补全空档',
  OPTIMIZE_ROUTE: '优化路线',
  ARRANGE_LUNCH: '安排午餐',
  REDUCE_INTENSITY: '降低强度',
  ARRANGE_LODGING: '补齐住宿',
  MOVE_ITEM: '移动行程项',
};

const VALIDATION_BADGE: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  PASS: {
    label: '校验通过',
    className: workbenchDecisionCheckerBadgeClass('success'),
    icon: CheckCircle2,
  },
  WARN: {
    label: '有警告',
    className: workbenchDecisionCheckerBadgeClass('warning'),
    icon: AlertTriangle,
  },
  BLOCK: {
    label: '存在阻断',
    className: workbenchDecisionCheckerBadgeClass('danger'),
    icon: XCircle,
  },
};

export interface PlanProposalDecisionSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: PlanProposal | null;
  aiAnswer?: string | null;
  applying?: boolean;
  discarding?: boolean;
  onApply: (force?: boolean) => void;
  onDiscard: () => void;
  applyComplete?: boolean;
  executionSteps?: PlanningDecisionExecutionStep[];
  validUntil?: string | null;
  /** GET /trips/:id/conflicts — 与 decisionPack.diagnostics 合并 */
  tripConflicts?: TripConflictDiagnosticInput[];
  monitorStale?: boolean;
  monitorStaleReason?: string | null;
  lodgingCoverage?: ArrangeLodgingCoverageSummary;
  onFillLodging?: () => void;
}

function DiagnosticsSection({ diagnostics }: { diagnostics: PlanningDecisionDiagnostic[] }) {
  if (!diagnostics.length) return null;
  return (
    <section className={cn(workbenchConflictSurface, 'rounded-xl p-3')}>
      <p className="mb-2 text-xs font-medium text-foreground">相关诊断</p>
      <ul className="space-y-2">
        {diagnostics.map((diagnostic) => (
          <li key={diagnostic.id} className="text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-medium text-foreground">{diagnostic.title}</p>
              {diagnostic.source === 'trip_conflicts' ? (
                <Badge variant="outline" className="h-4 rounded-full px-1.5 text-[9px]">
                  行程冲突
                </Badge>
              ) : null}
            </div>
            {diagnostic.message ? (
              <p className="mt-0.5 text-muted-foreground">{diagnostic.message}</p>
            ) : null}
            {diagnostic.dayIndex != null ? (
              <p className="mt-0.5 text-muted-foreground">第 {diagnostic.dayIndex} 天</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** mutation → decisionPack → 选项卡 → apply/discard → monitor → executionSteps */
export function PlanProposalDecisionSheet({
  tripId,
  open,
  onOpenChange,
  proposal,
  aiAnswer,
  applying = false,
  discarding = false,
  onApply,
  onDiscard,
  applyComplete = false,
  executionSteps,
  validUntil,
  tripConflicts,
  monitorStale = false,
  monitorStaleReason,
  lodgingCoverage,
  onFillLodging,
}: PlanProposalDecisionSheetProps) {
  const lodgingIncomplete =
    Boolean(lodgingCoverage?.totalNights) && !lodgingCoverage?.isComplete;

  const packOptions = proposal?.decisionPack?.options ?? [];
  const recommended =
    getRecommendedOption(proposal?.decisionPack) ?? pickRecommendedOption(packOptions);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(recommended?.id ?? null);

  useEffect(() => {
    setSelectedOptionId(recommended?.id ?? null);
  }, [proposal?.proposalId, recommended?.id]);

  const mergedDiagnostics = useMemo(
    () => mergePackDiagnosticsWithTripConflicts(proposal?.decisionPack, tripConflicts),
    [proposal?.decisionPack, tripConflicts],
  );

  const primaryDiagnostic = mergedDiagnostics[0];
  const whatHappenedText =
    primaryDiagnostic?.message?.trim() ||
    primaryDiagnostic?.title?.trim() ||
    proposal?.diff.summary?.trim() ||
    null;

  const validityUntil =
    validUntil ?? proposal?.decisionPack?.validUntil ?? proposal?.expiresAt;
  const validationMeta =
    VALIDATION_BADGE[proposal?.validation.status ?? 'WARN'] ?? VALIDATION_BADGE.WARN!;
  const ValidationIcon = validationMeta.icon;
  const isBlocked = proposal?.validation.status === 'BLOCK';
  const hasTripConflictFix = packOptions.some(isTripConflictsOption);
  const dialogOpen = open && proposal != null;

  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
      {proposal ? (
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/50 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-base">确认编排变更</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {INTENT_LABELS[proposal.intent] ?? proposal.intent}
                {proposal.affectedDays.length > 0
                  ? ` · 影响第 ${proposal.affectedDays.join('、')} 天`
                  : null}
                {hasTripConflictFix ? ' · 含冲突修复建议' : null}
              </DialogDescription>
            </div>
            <Badge variant="outline" className={cn('shrink-0 rounded-full text-[10px]', validationMeta.className)}>
              <ValidationIcon className="mr-1 h-3 w-3" />
              {validationMeta.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className={cn('min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3', workbenchScrollable)}>
          {monitorStale ? (
            <section className="rounded-lg border border-gate-confirm-border bg-gate-confirm/10 px-3 py-2 text-[11px] text-gate-confirm-foreground">
              决策条件已变化，请重新确认。
              {monitorStaleReason ? ` ${monitorStaleReason}` : null}
            </section>
          ) : null}

          {lodgingIncomplete && !applyComplete ? (
            <section className="rounded-lg border border-gate-warn-border bg-gate-warn/10 px-3 py-2.5 text-[11px] text-gate-warn-foreground">
              <p className="font-medium text-foreground">
                景点编排已完成，但还有 {lodgingCoverage?.missingNights} 晚未安排住宿
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                建议先补齐住宿，以便衔接次日出发与交通。你也可以先确认写入景点变更，稍后再补。
              </p>
            </section>
          ) : null}

          {applyComplete ? (
            <DecisionWriteBackStepsPanel phase="done" executionSteps={executionSteps} />
          ) : null}

          <DecisionValidityStrip
            validUntil={validityUntil}
            dependencyHint={proposal.decisionPack?.validityConstraint}
          />

          {packOptions.length > 0 ? (
            <DecisionExecutionProposalPanel
              tripId={tripId}
              proposalId={proposal.proposalId}
              conflictId={
                mergedDiagnostics.find((d) => d.conflictId)?.conflictId ??
                tripConflicts?.[0]?.id
              }
              whatHappened={whatHappenedText}
              packOptions={packOptions}
              selectedOptionId={selectedOptionId}
              onSelectOption={setSelectedOptionId}
            />
          ) : null}

          <DiagnosticsSection diagnostics={mergedDiagnostics} />

          {aiAnswer ? (
            <section className={workbenchAttractionExploreAiBox}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                AI 说明
              </div>
              <p className="text-[11px] leading-relaxed text-foreground">{aiAnswer}</p>
            </section>
          ) : null}

          <section>
            <p className="mb-1.5 text-xs font-medium text-foreground">变更摘要</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{proposal.diff.summary}</p>
          </section>

          {proposal.diff.timelineChanges.length > 0 ? (
            <section>
              <p className="mb-1.5 text-xs font-medium text-foreground">时间轴预览</p>
              <ul className="space-y-1.5">
                {proposal.diff.timelineChanges.map((change, index) => (
                  <li
                    key={`${change.label}-${index}`}
                    className="rounded-lg border border-border/55 bg-card px-2.5 py-2 text-[11px]"
                  >
                    <span className="font-medium text-foreground">{change.label}</span>
                    {change.dayIndex != null ? (
                      <span className="ml-2 text-muted-foreground">Day {change.dayIndex}</span>
                    ) : null}
                    {change.impact ? (
                      <span className="ml-2 text-muted-foreground">· {change.impact}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {proposal.tradeoffs && proposal.tradeoffs.length > 0 ? (
            <section>
              <p className="mb-1.5 text-xs font-medium text-foreground">取舍</p>
              <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                {proposal.tradeoffs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {proposal.validation.warnings.length > 0 || proposal.validation.conflicts.length > 0 ? (
            <section className={cn(workbenchConflictSurface, 'rounded-xl p-3')}>
              <p className="mb-2 text-xs font-medium text-foreground">校验冲突</p>
              <ul className="space-y-2">
                {proposal.validation.conflicts.map((conflict, index) => (
                  <li key={`${conflict.kind}-${index}`} className="text-[11px]">
                    <p className="font-medium text-foreground">{conflict.message}</p>
                    {conflict.dayIndex != null ? (
                      <p className="mt-0.5 text-muted-foreground">第 {conflict.dayIndex} 天</p>
                    ) : null}
                  </li>
                ))}
                {proposal.validation.warnings.map((warning, index) => (
                  <li key={`warn-${index}`} className="text-[11px] text-muted-foreground">
                    {warning}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/50 px-4 py-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={applying || discarding}
            onClick={() => {
              if (applyComplete) {
                onOpenChange(false);
                return;
              }
              onDiscard();
            }}
          >
            {discarding ? '丢弃中…' : applyComplete ? '关闭' : '丢弃草案'}
          </Button>
          <div className="flex gap-2">
            {applyComplete ? null : (
              <>
                {lodgingIncomplete && onFillLodging ? (
                  <Button
                    type="button"
                    size="sm"
                    className={workbenchPrimaryAction}
                    disabled={applying || discarding}
                    onClick={() => {
                      onOpenChange(false);
                      onFillLodging();
                    }}
                  >
                    先补齐住宿
                  </Button>
                ) : null}
                {isBlocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={applying || discarding}
                    onClick={() => onApply(true)}
                  >
                    仍要应用
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant={lodgingIncomplete && onFillLodging ? 'outline' : 'default'}
                  className={lodgingIncomplete && onFillLodging ? undefined : workbenchPrimaryAction}
                  disabled={applying || discarding || monitorStale}
                  onClick={() => onApply(false)}
                >
                  {applying ? '写入中…' : '确认写入行程'}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      ) : null}
    </Dialog>
  );
}
