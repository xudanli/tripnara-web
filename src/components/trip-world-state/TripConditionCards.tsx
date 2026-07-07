import { cn } from '@/lib/utils';
import type { TripConditionCardItem } from '@/lib/trip-overview-view.util';
import { conditionCardStatusTone } from '@/lib/trip-overview-view.util';

interface TripConditionCardsProps {
  items: TripConditionCardItem[];
  className?: string;
  /** 概览顶栏：单行紧凑展示 */
  layout?: 'default' | 'dense';
}

/** 总览固定条件卡 — 中性底 + 小面积状态色（§三.2） */
export function TripConditionCards({ items, className, layout = 'default' }: TripConditionCardsProps) {
  if (!items.length) return null;
  const dense = layout === 'dense';

  return (
    <section className={cn('rounded-xl border border-border bg-card shadow-none', dense ? 'p-2.5' : 'p-3', className)}>
      <h3 className={cn('font-semibold text-foreground', dense ? 'mb-1.5 text-xs' : 'mb-2 text-sm')}>
        行程条件
      </h3>
      <div
        className={cn(
          'grid gap-2',
          dense
            ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'rounded-lg border border-border/80',
              dense ? 'min-h-[3rem] px-2 py-1.5' : 'min-h-[3.75rem] px-2.5 py-2',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-foreground">{item.label}</p>
              <span
                className={cn(
                  'text-[11px] font-semibold shrink-0',
                  conditionCardStatusTone(item.status),
                )}
              >
                {item.statusLabel}
              </span>
            </div>
            {item.detail ? (
              <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">
                {item.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
