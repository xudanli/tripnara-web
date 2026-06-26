import { ClipboardList, Link2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { SplitConsensusWalletFootnote } from '@/lib/split-consensus-wallet-bridge';

interface BudgetSplitConsensusFootnoteProps {
  footnote: SplitConsensusWalletFootnote | null;
  loading?: boolean;
  isZh?: boolean;
  onOpenConsensus: () => void;
  className?: string;
}

export function BudgetSplitConsensusFootnote({
  footnote,
  loading = false,
  isZh = true,
  onOpenConsensus,
  className,
}: BudgetSplitConsensusFootnoteProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground',
          className,
        )}
      >
        <Spinner className="h-3.5 w-3.5" />
        {isZh ? '正在核对团队分摊共识…' : 'Checking team split consensus…'}
      </div>
    );
  }

  if (!footnote) return null;

  if (footnote.kind === 'locked_synced') {
    return (
      <div
        className={cn(
          'flex gap-2 rounded-md border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2.5',
          className,
        )}
      >
        <Lock className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
            {isZh ? '已与决策画像分摊共识同步' : 'Synced with decision profiling split consensus'}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isZh
              ? `团队已锁定「${footnote.lockedModeLabel ?? '分摊方案'}」。下方规则用于记一笔与欠账结算；若需变更请先在决策画像中协商。`
              : `Team locked "${footnote.lockedModeLabel ?? 'split plan'}". Rule below drives ledger; change via Decision Profiling first.`}
          </p>
        </div>
      </div>
    );
  }

  if (footnote.kind === 'pending_confirm') {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5',
          className,
        )}
      >
        <div className="flex gap-2 flex-1 min-w-0">
          <ClipboardList className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
              {isZh ? '尚未锁定团队分摊共识' : 'Team split consensus not locked yet'}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isZh
                ? `已选「${footnote.lockedModeLabel ?? '方案'}」${footnote.unconfirmedCount ? `，还有 ${footnote.unconfirmedCount} 人未确认` : ''}。锁定前此处规则可能变动，记账以当前选择为准。`
                : `Selected "${footnote.lockedModeLabel ?? 'plan'}"${footnote.unconfirmedCount ? `; ${footnote.unconfirmedCount} pending` : ''}. Wallet rule may change until locked.`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0 border-amber-200/80"
          onClick={onOpenConsensus}
        >
          {isZh ? '去确认' : 'Confirm'}
        </Button>
      </div>
    );
  }

  if (footnote.kind === 'in_progress') {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-gate-confirm-border bg-gate-confirm/30 px-3 py-2.5',
          className,
        )}
      >
        <div className="flex gap-2 flex-1 min-w-0">
          <Link2 className="h-4 w-4 shrink-0 text-gate-confirm-foreground mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isZh
              ? '团队正在决策画像中协商分摊方式。锁定前，下方规则仅为临时默认，可能与最终共识不一致。'
              : 'Team is negotiating split in Decision Profiling. Rule below is provisional until locked.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0"
          onClick={onOpenConsensus}
        >
          {isZh ? '分摊机制共识' : 'Split consensus'}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2.5',
        className,
      )}
    >
      <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
        {isZh
          ? '尚未完成团队分摊机制共识。建议先在决策画像中与队友选方案并全员确认，再依赖此处规则记账。'
          : 'Team split consensus not started. Set it in Decision Profiling before relying on wallet rules.'}
      </p>
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={onOpenConsensus}>
        {isZh ? '去决策画像' : 'Decision Profiling'}
      </Button>
    </div>
  );
}
