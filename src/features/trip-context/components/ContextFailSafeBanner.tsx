import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTripTravelContext } from '../context/TripTravelContext';

/** P0.5 — Fail-Safe：revision 冲突 / 写入失败 / 约束未通过 */
export function ContextFailSafeBanner({ className }: { className?: string }) {
  const { enabled, failSafe, dismissFailSafe, refresh, openContextDiff } = useTripTravelContext();

  if (!enabled || !failSafe) return null;

  return (
    <div
      className={cn(
        'border-b border-destructive/30 bg-destructive/5 px-4 py-3',
        className,
      )}
      role="alert"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{failSafe.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{failSafe.message}</p>
          {failSafe.preserveEffectivePlan ? (
            <p className="text-xs text-muted-foreground mt-1">当前生效方案保持不变。</p>
          ) : null}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (
                failSafe.kind === 'REVISION_CONFLICT' ||
                failSafe.kind === 'STALE_FACTS'
              ) {
                openContextDiff();
              } else {
                void refresh();
              }
            }}
          >
            {failSafe.kind === 'REVISION_CONFLICT' || failSafe.kind === 'STALE_FACTS'
              ? '查看变化对比'
              : '查看最新变化'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={dismissFailSafe}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
