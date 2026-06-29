import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CollabCenterEntryButtonProps {
  pendingCount?: number;
  onClick: () => void;
  className?: string;
}

/** 规划工作台顶栏右上角 · 团队协作中心主入口 */
export function CollabCenterEntryButton({
  pendingCount = 0,
  onClick,
  className,
}: CollabCenterEntryButtonProps) {
  const label =
    pendingCount > 0
      ? `打开团队协作中心，${pendingCount > 99 ? '99+' : pendingCount} 项待处理`
      : '打开团队协作中心';

  return (
    <Button
      type="button"
      size="sm"
      className={cn('relative h-8 gap-1.5 px-3 text-xs', className)}
      onClick={onClick}
      aria-label={label}
    >
      <Users className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">协作</span>
      {pendingCount > 0 ? (
        <Badge
          variant="secondary"
          className="ml-0.5 h-5 min-w-5 rounded-full border-0 bg-primary-foreground/20 px-1.5 text-[10px] text-primary-foreground"
        >
          {pendingCount > 99 ? '99+' : pendingCount}
        </Badge>
      ) : null}
    </Button>
  );
}
