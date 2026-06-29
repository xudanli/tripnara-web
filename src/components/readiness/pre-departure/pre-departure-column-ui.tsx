import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  workbenchPreDepartureAssigneeAvatar,
  workbenchPreDepartureColumnBody,
  workbenchPreDepartureColumnHeader,
  workbenchPreDepartureColumnShell,
  workbenchPreDepartureColumnTitle,
  workbenchPreDeparturePriorityBadgeClass,
  workbenchPreDepartureTaskStatusBadgeClass,
  workbenchSecondaryMetric,
} from '@/components/plan-studio/workbench/workbench-ui';

export function PreDepartureColumnShell({
  title,
  headerExtra,
  footerLabel,
  onViewAll,
  children,
  className,
}: {
  title: string;
  headerExtra?: React.ReactNode;
  footerLabel?: string;
  onViewAll?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(workbenchPreDepartureColumnShell, className)}>
      <div className={workbenchPreDepartureColumnHeader}>
        <h3 className={workbenchPreDepartureColumnTitle}>{title}</h3>
        {headerExtra}
      </div>
      <div className={workbenchPreDepartureColumnBody}>{children}</div>
      {footerLabel && onViewAll ? (
        <div className="border-t border-border/50 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between text-xs text-muted-foreground hover:text-foreground"
            onClick={onViewAll}
          >
            {footerLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function priorityToP0P2(priority: 'high' | 'medium' | 'low'): {
  label: string;
  className: string;
} {
  return {
    label: priority === 'high' ? 'P0' : priority === 'medium' ? 'P1' : 'P2',
    className: workbenchPreDeparturePriorityBadgeClass(priority),
  };
}

export function taskStatusMeta(
  task: { completed: boolean; priority: 'high' | 'medium' | 'low' },
  isBlocked?: boolean,
): { label: string; className: string } {
  if (task.completed) {
    return { label: '已完成', className: workbenchPreDepartureTaskStatusBadgeClass('completed') };
  }
  if (isBlocked || task.priority === 'high') {
    return { label: '阻塞中', className: workbenchPreDepartureTaskStatusBadgeClass('blocked') };
  }
  if (task.priority === 'medium') {
    return { label: '进行中', className: workbenchPreDepartureTaskStatusBadgeClass('in_progress') };
  }
  return { label: '待处理', className: workbenchPreDepartureTaskStatusBadgeClass('pending') };
}

export function AssigneeChip({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
      <span className={workbenchPreDepartureAssigneeAvatar}>{initial}</span>
      <span className="max-w-[4.5rem] truncate">{name}</span>
    </span>
  );
}

/** 列头统计数值（冰川蓝等宽） */
export function PreDepartureColumnMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cn('text-right', className)}>
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(workbenchSecondaryMetric, 'text-sm font-semibold')}>{value}</p>
    </div>
  );
}
