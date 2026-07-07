import { useEffect, useState } from 'react';
import { GitCompare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { TravelContextDiff } from '@/travel-context/client/travel-context-api.types';
import { useTripTravelContext } from '../context/TripTravelContext';
import {
  formatContextDiffSummary,
  resolveContextViewLabel,
} from '../lib/context-diff-display.util';

/** P0.4 — 上下文变化对比抽屉（apply 前查看 diff） */
export function ContextDiffDrawer() {
  const {
    enabled,
    revision,
    contextDiffOpen,
    contextDiffSinceRevision,
    closeContextDiff,
    getProvider,
    refresh,
  } = useTripTravelContext();

  const [diff, setDiff] = useState<TravelContextDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !contextDiffOpen) {
      setDiff(null);
      setError(null);
      return;
    }

    const provider = getProvider();
    if (!provider) {
      setError('Travel Context 未就绪');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void provider
      .fetchDiff(contextDiffSinceRevision)
      .then((result) => {
        if (!cancelled) setDiff(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '无法加载变化对比');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, contextDiffOpen, contextDiffSinceRevision, getProvider]);

  if (!enabled) return null;

  const changedViews = diff?.changedViews ?? [];

  return (
    <Sheet open={contextDiffOpen} onOpenChange={(open) => !open && closeContextDiff()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4 text-muted-foreground" aria-hidden />
            行程变化对比
          </SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            查看自上一版本以来哪些部分发生了变化。当前生效方案不会被自动覆盖。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">当前版本</p>
            <p className="mt-1 font-mono-brand text-sm tabular-nums text-muted-foreground">
              v{revision}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              正在加载变化…
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3">
              <p className="text-xs text-destructive">{error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 h-8"
                onClick={() => void refresh()}
              >
                重新同步
              </Button>
            </div>
          ) : null}

          {!loading && !error && diff ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {formatContextDiffSummary({
                  fromRevision: diff.fromRevision,
                  toRevision: diff.toRevision,
                  changedViews: diff.changedViews,
                })}
              </p>

              {diff.requiresFullRefresh ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3">
                  <p className="text-xs font-medium text-foreground">变化较多</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    部分更新需要完整刷新才能准确展示，建议同步最新数据后再操作。
                  </p>
                </div>
              ) : null}

              {changedViews.length > 0 ? (
                <ul className="space-y-2">
                  {changedViews.map((view) => (
                    <li
                      key={view}
                      className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
                    >
                      <span className="text-sm text-foreground">{resolveContextViewLabel(view)}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                        已更新
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  未检测到具体视图变更，可能仅为内部版本递增。
                </p>
              )}
            </>
          ) : null}
        </div>

        <div className="border-t border-border/60 px-5 py-4 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1 h-9"
            disabled={loading}
            onClick={() => void refresh().then(() => closeContextDiff())}
          >
            <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} />
            同步最新并关闭
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-9" onClick={closeContextDiff}>
            关闭
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
