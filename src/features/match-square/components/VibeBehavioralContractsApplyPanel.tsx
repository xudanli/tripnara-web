import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  VibeBehavioralContractsList,
  type VibeBehavioralContractItem,
} from './VibeBehavioralContractsList';

interface VibeBehavioralContractsApplyPanelProps {
  contracts: VibeBehavioralContractItem[];
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  className?: string;
}

/** 申请弹窗 · Vibe 行为契约签收面板 */
export function VibeBehavioralContractsApplyPanel({
  contracts,
  accepted,
  onAcceptedChange,
  className,
}: VibeBehavioralContractsApplyPanelProps) {
  if (!contracts.length) return null;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-md border border-[var(--gate-confirm-border)] bg-[var(--gate-confirm)]/20',
        className
      )}
      aria-label="Vibe 行为契约"
    >
      <header className="flex items-center gap-1.5 border-b border-[var(--gate-confirm-border)]/40 px-2.5 py-1.5">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--gate-confirm-foreground)]" aria-hidden />
        <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <p className="text-xs font-medium text-foreground">Vibe 行为契约</p>
          <p className="text-[10px] text-muted-foreground">共 {contracts.length} 项 · 申请前须签收</p>
        </div>
      </header>

      <div className="px-2.5 py-2">
        <VibeBehavioralContractsList
          contracts={contracts}
          variant="apply"
          className="grid gap-1.5 sm:grid-cols-2"
        />
      </div>

      <div className="flex items-start gap-2 border-t border-[var(--gate-confirm-border)]/40 bg-background/30 px-2.5 py-2">
        <Checkbox
          id="pledge-vibe"
          className="mt-0.5"
          checked={accepted}
          onCheckedChange={(v) => onAcceptedChange(v === true)}
        />
        <Label htmlFor="pledge-vibe" className="cursor-pointer text-xs leading-snug">
          我已阅读并同意上述全部行为契约
        </Label>
      </div>
    </section>
  );
}
