import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DecisionAcknowledgementPanel } from '@/components/decision-problems/DecisionAcknowledgementPanel';
import { areDecisionAcknowledgementsComplete } from '@/lib/decision-acknowledgement.util';
import {
  formatScheduleContextEvidence,
  resolveSelectedRepairOptionId,
} from '@/lib/execution-slip.util';
import type { ConsumerDecisionItem } from '@/types/mobile-execution';

export interface ExecutionScheduleDecisionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: ConsumerDecisionItem | null;
  loading?: boolean;
  applying?: boolean;
  onAccept: (input: { selectedOptionId: string; acknowledgements: string[] }) => void | Promise<void>;
}

const SEVERITY_LABEL: Record<ConsumerDecisionItem['severity'], string> = {
  BLOCK: '紧急',
  CONFLICT: '需调整',
  VERIFY: '待确认',
  OPTIMIZE: '可优化',
};

export function ExecutionScheduleDecisionSheet({
  open,
  onOpenChange,
  decision,
  loading = false,
  applying = false,
  onAccept,
}: ExecutionScheduleDecisionSheetProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [checkedAcknowledgements, setCheckedAcknowledgements] = useState<string[]>([]);

  const requiredAcknowledgements = decision?.requiredAcknowledgements ?? [];
  const repairOptions = decision?.repairOptions ?? [];

  const defaultOptionId = useMemo(
    () => resolveSelectedRepairOptionId(decision, selectedOptionId),
    [decision, selectedOptionId],
  );

  useEffect(() => {
    if (!open || !decision) return;
    setSelectedOptionId(resolveSelectedRepairOptionId(decision, null));
    setCheckedAcknowledgements([]);
  }, [open, decision?.problemId]);

  const scheduleEvidence = formatScheduleContextEvidence(
    decision?.scheduleContext ?? repairOptions.find((opt) => opt.optionId === defaultOptionId)?.scheduleContext,
  );

  const canConfirm =
    Boolean(defaultOptionId) &&
    areDecisionAcknowledgementsComplete(requiredAcknowledgements, checkedAcknowledgements);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden sm:max-w-xl p-0">
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle>行程调整建议</SheetTitle>
          <SheetDescription>确认后将更新今日及后续行程安排</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading && !decision ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {decision ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={decision.severity === 'BLOCK' ? 'destructive' : 'secondary'}>
                  {SEVERITY_LABEL[decision.severity]}
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{decision.headline}</h3>
                {decision.explanation ? (
                  <p className="text-sm text-muted-foreground">{decision.explanation}</p>
                ) : null}
                {decision.impact ? (
                  <p className="text-sm text-muted-foreground">{decision.impact}</p>
                ) : null}
              </div>

              {decision.affectedActivities?.length ? (
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs space-y-1">
                  <p className="font-medium text-foreground">受影响活动</p>
                  {decision.affectedActivities.map((activity) => (
                    <p key={activity.activityId} className="text-muted-foreground">
                      · {activity.title}
                      {activity.dayIndex != null ? `（Day ${activity.dayIndex}）` : ''}
                    </p>
                  ))}
                </div>
              ) : null}

              {scheduleEvidence ? (
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
                  {scheduleEvidence}
                </div>
              ) : null}

              {repairOptions.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">可选方案</p>
                  <ul className="space-y-2">
                    {repairOptions.map((option) => {
                      const selected = (selectedOptionId ?? defaultOptionId) === option.optionId;
                      return (
                        <li key={option.optionId}>
                          <button
                            type="button"
                            disabled={option.canApply === false || applying}
                            className={cn(
                              'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                              selected
                                ? 'border-primary bg-primary/5'
                                : 'border-border/70 bg-card hover:bg-muted/20',
                              option.canApply === false && 'opacity-60 cursor-not-allowed',
                            )}
                            onClick={() => setSelectedOptionId(option.optionId)}
                          >
                            <p className="text-sm font-medium text-foreground">{option.title}</p>
                            {option.summary ? (
                              <p className="mt-1 text-xs text-muted-foreground">{option.summary}</p>
                            ) : null}
                            {option.changePreview?.shortenMinutes != null ? (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                释放约 {option.changePreview.shortenMinutes} 分钟
                              </p>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {requiredAcknowledgements.length ? (
                <DecisionAcknowledgementPanel
                  items={requiredAcknowledgements}
                  checked={checkedAcknowledgements}
                  onToggle={(item, checked) => {
                    setCheckedAcknowledgements((prev) =>
                      checked ? [...prev, item] : prev.filter((entry) => entry !== item),
                    );
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>

        <div className="border-t border-border/60 px-6 py-4">
          <Button
            type="button"
            className="w-full"
            disabled={!decision || !canConfirm || applying}
            onClick={() => {
              if (!defaultOptionId) return;
              void onAccept({
                selectedOptionId: defaultOptionId,
                acknowledgements: checkedAcknowledgements,
              });
            }}
          >
            {applying ? '确认中…' : '确认方案'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
