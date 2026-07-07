import { Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArrangeItemLocksResponse } from '@/types/arrange-itinerary';
import { workbenchAttractionExploreSectionTitle, workbenchScrollable } from '../workbench-ui';

export interface ArrangeItineraryItemLocksPanelProps {
  itemLocks?: ArrangeItemLocksResponse | null;
  userLockedItemIds?: Set<string>;
  loading?: boolean;
  onToggleUserLock?: (itemId: string, locked: boolean) => void;
  lockTogglePending?: boolean;
  className?: string;
}

export function ArrangeItineraryItemLocksPanel({
  itemLocks,
  userLockedItemIds,
  loading = false,
  className,
}: ArrangeItineraryItemLocksPanelProps) {
  if (loading) {
    return <p className={cn('text-[11px] text-muted-foreground', className)}>加载锁定信息…</p>;
  }
  if (!itemLocks) return null;

  const lockedCount = itemLocks.lockedItems.length + itemLocks.semiLockedItems.length;
  const mustVisitCount = itemLocks.mustVisitItems.length;

  return (
    <section className={cn(className)}>
      <p className={workbenchAttractionExploreSectionTitle}>行程项锁定</p>
      <dl className="mt-2 space-y-1 text-[11px]">
        <Row label="已锁定" value={`${lockedCount} 项`} />
        <Row label="必去" value={`${mustVisitCount} 项`} />
        <Row label="可移动" value={`${itemLocks.movableItems.length} 项`} />
        {userLockedItemIds && userLockedItemIds.size > 0 ? (
          <Row label="手动锁定" value={`${userLockedItemIds.size} 项`} />
        ) : null}
      </dl>
      {itemLocks.semiLockedItems.length > 0 ? (
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          半锁定项优化路线时会尽量保留时段，仅微调顺序。
        </p>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function ArrangeItineraryLockBadge({
  itemId,
  itemLocks,
  userLockedItemIds,
}: {
  itemId: string;
  itemLocks?: ArrangeItemLocksResponse | null;
  userLockedItemIds?: Set<string>;
}) {
  const isUserLocked = userLockedItemIds?.has(itemId);
  const isLocked = itemLocks?.lockedItems.some((item) => item.itemId === itemId);
  const isSemi = itemLocks?.semiLockedItems.some((item) => item.itemId === itemId);
  const isMust = itemLocks?.mustVisitItems.some((item) => item.itemId === itemId);

  if (!isUserLocked && !isLocked && !isSemi && !isMust) return null;

  const label = isUserLocked || isLocked ? '已锁定' : isSemi ? '半锁定' : '必去';
  const Icon = isUserLocked || isLocked ? Lock : LockOpen;

  return (
    <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
