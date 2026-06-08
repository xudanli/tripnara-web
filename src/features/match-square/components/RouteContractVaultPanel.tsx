import { Lock, ShieldCheck, Undo2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RouteContractLockPlan } from '@/types/route-template-intent';
import { formatVaultMilestoneAmount, sumVaultMilestoneCents } from '../lib/route-contract-vault';
import { cn } from '@/lib/utils';

type RouteContractVaultPanelProps = {
  plan: RouteContractLockPlan;
  variant?: 'detail' | 'manage' | 'apply';
  className?: string;
};

function formatTotalCents(cents: number, milestones: RouteContractLockPlan['milestones']): string {
  const currencies = new Set(milestones.map((m) => m.currency).filter(Boolean));
  const currency = currencies.size === 1 ? [...currencies][0] : undefined;
  if (currency === 'CNY' || !currency) return `¥${(cents / 100).toLocaleString('zh-CN')}`;
  return `${(cents / 100).toLocaleString('zh-CN')}（多币种）`;
}

/** §3.11 Phase 3 · Route Contract Lock × Trip Vault 预览 */
export function RouteContractVaultPanel({
  plan,
  variant = 'detail',
  className,
}: RouteContractVaultPanelProps) {
  const isApply = variant === 'apply';
  const isManage = variant === 'manage';
  const totalCents = sumVaultMilestoneCents(plan.milestones);

  return (
    <section
      className={cn(
        'rounded-xl border text-sm',
        isApply
          ? 'border-amber-500/25 bg-amber-500/5 px-3 py-2.5'
          : 'border-border bg-muted/20 px-4 py-3.5',
        className
      )}
      aria-label="路线契约与 Trip Vault"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <ShieldCheck
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              isApply ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
            )}
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <p className="font-medium leading-snug text-foreground">
              Route Contract Lock · {plan.templateTitle}
            </p>
            {!isApply && (
              <p className="text-xs leading-relaxed text-muted-foreground">{plan.contractSummary}</p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
          Vault · 预览
        </Badge>
      </div>

      <ul className={cn('mt-2 space-y-1', isApply && 'text-xs')}>
        {plan.milestones.map((m) => {
          const amount = formatVaultMilestoneAmount(m);
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground"
            >
              <Lock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <span className="text-foreground/90">{m.label}</span>
              {amount && (
                <span className="inline-flex items-center gap-0.5 tabular-nums text-[11px]">
                  <Wallet className="h-3 w-3" aria-hidden />
                  托管 {amount}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {totalCents > 0 && !isApply && (
        <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
          里程碑托管合计（预览）：{formatTotalCents(totalCents, plan.milestones)}
        </p>
      )}

      {!isApply && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Undo2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          {plan.rollbackHint}
        </p>
      )}

      {isManage && plan.captainCanRollback && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Trip Vault API 接线后，此处可发起 rollback 并触发全队确认流。
        </p>
      )}

      {isApply && (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          确认加入即授权上述里程碑节奏；资金锁由 Trip Vault 在成团后自动生效。
        </p>
      )}
    </section>
  );
}
