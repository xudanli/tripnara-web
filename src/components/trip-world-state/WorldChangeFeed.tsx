import { cn } from '@/lib/utils';
import type { WorldChangeFeedItem } from '@/lib/trip-overview-view.util';
import { formatWorldChangeTime } from '@/lib/trip-overview-view.util';

interface WorldChangeFeedProps {
  items: WorldChangeFeedItem[];
  className?: string;
}

/** 最近变化 — 展示「变化 → 对行程的影响」（§三.3） */
export function WorldChangeFeed({ items, className }: WorldChangeFeedProps) {
  if (!items.length) return null;

  return (
    <section className={cn('rounded-xl border border-border bg-card p-3 shadow-none', className)}>
      <h3 className="mb-2 text-sm font-semibold text-foreground">最近变化</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <p className="text-xs font-medium text-foreground">{item.subject}</p>
              {item.occurredAt ? (
                <span className="text-[10px] text-muted-foreground">
                  {formatWorldChangeTime(item.occurredAt)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.change}</p>
            {item.impact ? (
              <p className="text-[11px] text-foreground/80 mt-1">
                影响：<span className="text-muted-foreground">{item.impact}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
