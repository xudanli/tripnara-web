import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PlanningInboxBadgeProps {
  count: number;
  className?: string;
}

/** 与 Plan Studio「规划待办」Tab 角标共用样式 */
export function PlanningInboxBadge({ count, className }: PlanningInboxBadgeProps) {
  if (count <= 0) return null;
  return (
    <Badge
      variant="destructive"
      className={cn(
        'h-5 min-w-[1.25rem] px-1.5 text-[10px] font-semibold leading-none tabular-nums',
        className,
      )}
    >
      {count}
    </Badge>
  );
}
