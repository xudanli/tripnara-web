import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { workbenchSoftPriorityClass } from '@/components/plan-studio/workbench/workbench-ui';
import type { CollabPendingItem } from '@/hooks/useCollabOverview';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface PendingItemsWidgetProps {
  items: CollabPendingItem[];
  onHandleItem?: (item: CollabPendingItem) => void;
}

export function PendingItemsWidget({ items, onHandleItem }: PendingItemsWidgetProps) {
  return (
    <CollabWidgetCard
      title="待决事项"
      description={items.length > 0 ? '需尽快推进' : '暂无待决'}
    >
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">当前没有待处理的协商、投票或任务。</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <li
              key={item.id}
              className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                <Badge
                  variant="outline"
                  className={cn('mt-1 h-5 text-[10px] font-normal', workbenchSoftPriorityClass(item.priority))}
                >
                  {item.priority}
                </Badge>
              </div>
              {onHandleItem ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 text-xs"
                  onClick={() => onHandleItem(item)}
                >
                  去处理
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </CollabWidgetCard>
  );
}
