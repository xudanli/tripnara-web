import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LockedSplitRuleDisplay } from '@/lib/split-consensus-wallet-bridge';

interface BudgetLockedSplitRuleCardProps {
  display: LockedSplitRuleDisplay;
  isZh?: boolean;
  className?: string;
}

/** 分摊共识已锁定：只读双行（团队共识 + 记账规则），替代预算下拉 */
export function BudgetLockedSplitRuleCard({
  display,
  isZh = true,
  className,
}: BudgetLockedSplitRuleCardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-gate-allow-border/80 bg-gate-allow/40 dark:bg-gate-allow/20 px-3 py-3 space-y-2',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Lock className="h-4 w-4 shrink-0 text-gate-allow-foreground mt-0.5" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium text-gate-allow-foreground dark:text-gate-allow-foreground">
            {isZh ? '团队分摊已锁定（决策画像）' : 'Team split locked (Decision Profiling)'}
          </p>
          <div className="grid gap-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground shrink-0">
                {isZh ? '团队共识' : 'Consensus'}
              </span>
              <span className="font-medium text-foreground">{display.consensusLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground shrink-0">
                {isZh ? '记账规则' : 'Wallet rule'}
              </span>
              <span className="font-medium text-foreground">{display.walletModeLabel}</span>
              {!display.modesDirectMatch ? (
                <Badge variant="outline" className="text-[10px] font-normal h-5">
                  {isZh ? '已映射' : 'Mapped'}
                </Badge>
              ) : null}
              <span className="text-muted-foreground tabular-nums">
                · {display.splitBase} {isZh ? '人' : 'people'}
              </span>
            </div>
          </div>
          {display.detailLines.length > 0 ? (
            <ul className="text-[11px] text-muted-foreground space-y-0.5 border-t border-gate-allow-border/50 pt-2">
              {display.detailLines.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {isZh
              ? '记一笔与欠账按记账规则执行。若要变更，请先在决策画像中重新协商并锁定。'
              : 'Expenses use the wallet rule above. To change, re-negotiate in Decision Profiling.'}
          </p>
        </div>
      </div>
    </div>
  );
}
