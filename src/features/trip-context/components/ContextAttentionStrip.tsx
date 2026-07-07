import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTripTravelContext } from '../context/TripTravelContext';

/** P0.1 / P0.4 — 全局变化提醒条 */
export function ContextAttentionStrip({ className }: { className?: string }) {
  const { enabled, attention, dismissAttention } = useTripTravelContext();

  if (!enabled || !attention) return null;

  const tone =
    attention.severity === 'action'
      ? 'border-primary/40 bg-primary/5'
      : attention.severity === 'warning'
        ? 'border-amber-500/40 bg-amber-500/5'
        : 'border-border bg-card';

  return (
    <div className={cn('border-b px-4 py-3', tone, className)} role="status">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{attention.headline}</p>
          {attention.body ? (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{attention.body}</p>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {attention.primaryActionLabel && attention.onPrimaryAction ? (
            <Button type="button" size="sm" variant="default" onClick={attention.onPrimaryAction}>
              {attention.primaryActionLabel}
            </Button>
          ) : null}
          {attention.dismissible !== false ? (
            <Button type="button" size="sm" variant="ghost" onClick={dismissAttention}>
              知道了
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
