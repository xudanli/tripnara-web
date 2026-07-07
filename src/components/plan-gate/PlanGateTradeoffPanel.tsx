import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { PlanGatePendingConfirmation, PlanGateUserConfirmationState } from '@/types/plan-gate';
import { Scale } from 'lucide-react';
import { planGateCard, planGatePrimaryButton } from './plan-gate-ui';

export interface PlanGateTradeoffPanelProps {
  confirmations: PlanGatePendingConfirmation[];
  userConfirmations: PlanGateUserConfirmationState[];
  onChange: (next: PlanGateUserConfirmationState[]) => void;
  onContinue?: () => void;
  continuing?: boolean;
}

export function PlanGateTradeoffPanel({
  confirmations,
  userConfirmations,
  onChange,
  onContinue,
  continuing,
}: PlanGateTradeoffPanelProps) {
  const tradeOffs = useMemo(
    () => confirmations.filter((item) => item.kind === 'trade_off'),
    [confirmations],
  );

  const [selectedByConfirmation, setSelectedByConfirmation] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of userConfirmations) {
      if (item.choiceId) initial[item.confirmationId] = item.choiceId;
    }
    return initial;
  });

  if (tradeOffs.length === 0) return null;

  const handleSelect = (confirmation: PlanGatePendingConfirmation, choiceId: string) => {
    setSelectedByConfirmation((prev) => ({ ...prev, [confirmation.id]: choiceId }));
    const others = userConfirmations.filter((c) => c.confirmationId !== confirmation.id);
    onChange([
      ...others,
      { confirmationId: confirmation.id, accepted: true, choiceId },
    ]);
  };

  const allSelected = tradeOffs.every((item) => Boolean(selectedByConfirmation[item.id]));

  return (
    <div className="space-y-4">
      {tradeOffs.map((confirmation) => (
        <div key={confirmation.id} className={planGateCard}>
          <div className="mb-3 flex items-start gap-2">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-gate-confirm-foreground" />
            <div>
              <h4 className="text-xs font-medium text-foreground">{confirmation.title}</h4>
              {confirmation.description ? (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {confirmation.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            {(confirmation.options ?? []).map((option, index) => {
              const selected = selectedByConfirmation[confirmation.id] === option.id;
              const letter = String.fromCharCode(65 + index);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(confirmation, option.id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    selected
                      ? 'border-primary bg-muted/25 ring-1 ring-border'
                      : 'border-border bg-background hover:bg-muted/50',
                  )}
                >
                  <span className="mr-2 font-medium text-muted-foreground">{letter}.</span>
                  <span className="font-medium text-foreground">{option.label}</span>
                  {option.description ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {option.description}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {onContinue ? (
        <div className="flex justify-end">
          <Button
            type="button"
            className={planGatePrimaryButton}
            disabled={!allSelected || continuing}
            onClick={onContinue}
          >
            {continuing ? (
              <>
                <Spinner className="mr-1.5 h-3.5 w-3.5" />
                处理中…
              </>
            ) : (
              '确认选择并继续'
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
