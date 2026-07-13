import { useState } from 'react';
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
import type { ArrangeItineraryProposalWriteResponse, PlanProposal } from '@/types/arrange-itinerary';
import { PlanningProposalOptionsPanel } from '@/components/decision-problems/PlanningProposalOptionsPanel';
import { DecisionValidityStrip } from '@/components/decision-problems/DecisionValidityStrip';
import { DecisionWriteBackStepsPanel } from '@/components/decision-problems/DecisionWriteBackStepsPanel';
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

export interface ArrangeItineraryProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: PlanProposal | null;
  aiAnswer?: string | null;
  applying?: boolean;
  discarding?: boolean;
  onApply: (force?: boolean) => void;
  onDiscard: () => void;
  /** P6 写回步骤（apply 完成后） */
  applyComplete?: boolean;
  executionSteps?: import('@/types/planning-decision-pack').PlanningDecisionExecutionStep[];
  validUntil?: string | null;
}

export function ArrangeItineraryProposalDialog({
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
}: ArrangeItineraryProposalDialogProps) {
  const packOptions = proposal?.decisionPack?.options ?? [];
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    packOptions.find((option) => option.recommended)?.id ?? packOptions[0]?.id ?? null,
  );

  const validityUntil =
    validUntil ?? proposal?.decisionPack?.validUntil ?? proposal?.expiresAt;
  const validationMeta =
    VALIDATION_BADGE[proposal?.validation.status ?? 'WARN'] ?? VALIDATION_BADGE.WARN!;
  const ValidationIcon = validationMeta.icon;
  const isBlocked = proposal?.validation.status === 'BLOCK';
  const dialogOpen = open && proposal != null;

  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
      {proposal ? (
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/50 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-base">确认编排变更</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {INTENT_LABELS[proposal.intent] ?? proposal.intent}
                {proposal.affectedDays.length > 0
                  ? ` · 影响第 ${proposal.affectedDays.join('、')} 天`
                  : null}
              </DialogDescription>
            </div>
            <Badge variant="outline" className={cn('shrink-0 rounded-full text-[10px]', validationMeta.className)}>
              <ValidationIcon className="mr-1 h-3 w-3" />
              {validationMeta.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className={cn('min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3', workbenchScrollable)}>
          {applyComplete ? (
            <DecisionWriteBackStepsPanel
              phase="done"
              executionSteps={executionSteps}
            />
          ) : null}

          <DecisionValidityStrip
            validUntil={validityUntil}
            dependencyHint={proposal.decisionPack?.validityConstraint}
          />

          {packOptions.length > 0 ? (
            <PlanningProposalOptionsPanel
              options={packOptions}
              selectedOptionId={selectedOptionId}
              onSelect={setSelectedOptionId}
            />
          ) : null}

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
              <p className="mb-2 text-xs font-medium text-foreground">冲突详情</p>
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
              className={workbenchPrimaryAction}
              disabled={applying || discarding}
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

export function extractProposalFromWriteResult(
  result: unknown,
): ArrangeItineraryProposalWriteResponse | null {
  if (
    result != null &&
    typeof result === 'object' &&
    (result as ArrangeItineraryProposalWriteResponse).mode === 'proposal'
  ) {
    return result as ArrangeItineraryProposalWriteResponse;
  }
  return null;
}
