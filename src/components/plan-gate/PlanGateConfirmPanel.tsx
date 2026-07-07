import { useEffect, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { GateStatus } from '@/lib/gate-status';
import type { PlanGatePendingConfirmation, PlanGateUserConfirmationState } from '@/types/plan-gate';
import { WorkbenchGateStatusBanner } from '@/components/plan-studio/workbench/WorkbenchGateStatusBanner';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';

export interface PlanGateConfirmPanelProps {
  status?: GateStatus;
  headline?: string;
  confirmations: PlanGatePendingConfirmation[];
  userConfirmations: PlanGateUserConfirmationState[];
  onChange: (next: PlanGateUserConfirmationState[]) => void;
  className?: string;
  bannerMessage?: string;
  /** 仅展示 sign_off 项（trade_off 在取舍步骤处理） */
  signOffOnly?: boolean;
}

export function PlanGateConfirmPanel({
  status = 'NEED_CONFIRM',
  headline,
  confirmations,
  userConfirmations,
  onChange,
  className,
  bannerMessage,
  signOffOnly = true,
}: PlanGateConfirmPanelProps) {
  const items = useMemo(
    () =>
      signOffOnly
        ? confirmations.filter((item) => item.kind === 'sign_off')
        : confirmations,
    [confirmations, signOffOnly],
  );

  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initial = new Set(
      userConfirmations.filter((c) => c.accepted).map((c) => c.confirmationId),
    );
    setChecked(initial);
  }, [items.map((i) => i.id).join('\u0000')]);

  const toggle = (item: PlanGatePendingConfirmation, value: boolean) => {
    const nextChecked = new Set(checked);
    if (value) nextChecked.add(item.id);
    else nextChecked.delete(item.id);
    setChecked(nextChecked);

    const others = userConfirmations.filter((c) => c.confirmationId !== item.id);
    const next: PlanGateUserConfirmationState[] = [...others];
    if (value) {
      next.push({ confirmationId: item.id, accepted: true });
    }
    onChange(next);

    const allDone = items.length > 0 && items.every((entry) => nextChecked.has(entry.id));
    if (allDone && items.length > 0) {
      // parent derives canProceed from onChange payload
    }
  };

  const allConfirmed = items.length > 0 && items.every((item) => checked.has(item.id));

  if (items.length === 0) return null;

  return (
    <div className={cn(workbenchCard, 'space-y-2.5 p-2.5', className)}>
      <WorkbenchGateStatusBanner
        status={status}
        message={bannerMessage ?? (status === 'NEED_CONFIRM' ? '请逐项签收后继续' : undefined)}
        size="sm"
      />

      {headline ? (
        <p className="rounded-lg border border-gate-confirm-border/50 bg-gate-confirm/8 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
          {headline}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {items.map((item) => {
          const isChecked = checked.has(item.id);
          return (
            <li
              key={item.id}
              className={cn(
                'flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors',
                isChecked
                  ? 'border-primary/25 bg-muted/25'
                  : 'border-border/60 bg-background/80',
              )}
            >
              <Checkbox
                id={`plan-gate-confirm-${item.id}`}
                checked={isChecked}
                onCheckedChange={(value) => toggle(item, value === true)}
                className="mt-0.5"
              />
              <label
                htmlFor={`plan-gate-confirm-${item.id}`}
                className="flex-1 cursor-pointer"
              >
                <span className="block text-[11px] font-medium text-foreground">{item.title}</span>
                {item.description ? (
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>

      {!allConfirmed ? (
        <p className="text-[10px] text-muted-foreground">勾选全部签收项后，主操作才会解锁。</p>
      ) : (
        <p className="text-[10px] font-medium text-gate-allow-foreground">已全部签收，可继续。</p>
      )}
    </div>
  );
}
