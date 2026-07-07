import { Radar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TripMonitoringWatchItem } from '@/lib/trip-overview-view.util';

interface TripMonitoringWatchlistProps {
  items: TripMonitoringWatchItem[];
  className?: string;
}

/** TripNARA 正在持续关注 — §三.4 */
export function TripMonitoringWatchlist({ items, className }: TripMonitoringWatchlistProps) {
  if (!items.length) return null;

  return (
    <section className={cn('rounded-xl border border-border bg-card p-3 shadow-none', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <Radar className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">TripNARA 正在持续关注</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex gap-1.5 text-[11px]">
            <span className="text-muted-foreground shrink-0">·</span>
            <span>
              <span className="font-medium text-foreground">{item.label}</span>
              {item.summary ? (
                <span className="text-muted-foreground"> — {item.summary}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
