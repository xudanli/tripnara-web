import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { GateStatus } from '@/lib/gate-status';
import { WorkbenchGateStatusBanner } from './WorkbenchGateStatusBanner';
import { workbenchCard } from './workbench-ui';

export interface WorkbenchConfirmPanelProps {
  status?: GateStatus;
  /** 风险 / 背景说明 */
  riskExplanation?: string;
  /** 签收确认项（问句或陈述） */
  confirmations: string[];
  onAllConfirmedChange?: (allConfirmed: boolean) => void;
  className?: string;
  /** 顶部 Banner 文案，默认随 status */
  bannerMessage?: string;
}

/** 工作台 · NEED_CONFIRM 签收清单（紧凑、无弹窗 CTA） */
export function WorkbenchConfirmPanel({
  status = 'NEED_CONFIRM',
  riskExplanation,
  confirmations,
  onAllConfirmedChange,
  className,
  bannerMessage,
}: WorkbenchConfirmPanelProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    setChecked(new Set());
    onAllConfirmedChange?.(false);
  }, [confirmations.join('\u0000'), riskExplanation, status]);

  const toggle = (index: number, value: boolean) => {
    const next = new Set(checked);
    if (value) next.add(index);
    else next.delete(index);
    setChecked(next);
    const allDone = confirmations.length > 0 && next.size === confirmations.length;
    onAllConfirmedChange?.(allDone);
  };

  const allConfirmed =
    confirmations.length > 0 && checked.size === confirmations.length;

  return (
    <div className={cn(workbenchCard, 'space-y-2.5 p-2.5', className)}>
      <WorkbenchGateStatusBanner
        status={status}
        message={bannerMessage ?? (status === 'NEED_CONFIRM' ? '请逐项签收后继续' : undefined)}
        size="sm"
      />

      {riskExplanation ? (
        <p className="rounded-lg border border-border/50 bg-muted/8 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
          {riskExplanation}
        </p>
      ) : null}

      {confirmations.length > 0 ? (
        <ul className="space-y-1.5">
          {confirmations.map((item, index) => {
            const isChecked = checked.has(index);
            return (
              <li
                key={`${index}-${item.slice(0, 24)}`}
                className={cn(
                  'flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors',
                  isChecked
                    ? 'border-primary/25 bg-muted/25'
                    : 'border-border/60 bg-background/80',
                )}
              >
                <Checkbox
                  id={`workbench-confirm-${index}`}
                  checked={isChecked}
                  onCheckedChange={(value) => toggle(index, value === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`workbench-confirm-${index}`}
                  className="flex-1 cursor-pointer text-[11px] leading-relaxed text-foreground"
                >
                  {item}
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}

      {confirmations.length > 0 && !allConfirmed ? (
        <p className="text-[10px] text-muted-foreground">
          勾选全部签收项后，主操作才会解锁。
        </p>
      ) : null}

      {allConfirmed ? (
        <p className="text-[10px] font-medium text-success">
          已全部签收，可继续提交或确认。
        </p>
      ) : null}
    </div>
  );
}
