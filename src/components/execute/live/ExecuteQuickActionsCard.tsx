import { Bell, CalendarDays, Headphones, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { executeSidebarUi } from './execute-sidebar-ui';

export interface ExecuteQuickActionItem {
  id: string;
  label: string;
  icon: typeof CalendarDays;
  onClick?: () => void;
}

const DEFAULT_ACTIONS: ExecuteQuickActionItem[] = [
  { id: 'adjust', label: '调整行程', icon: CalendarDays },
  { id: 'guide', label: '联系导游', icon: Headphones },
  { id: 'notify', label: '发送通知', icon: Bell },
  { id: 'record', label: '记录事件', icon: Pencil },
];

interface ExecuteQuickActionsCardProps {
  actions?: ExecuteQuickActionItem[];
  className?: string;
}

function QuickActionButton({ action }: { action: ExecuteQuickActionItem }) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      className={cn(
        'flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-md border border-border/70',
        'bg-card px-1.5 py-1 transition-colors hover:bg-muted/30 hover:border-border',
      )}
      onClick={action.onClick}
    >
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', executeSidebarUi.iconCell)}>
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <span className="text-[9px] font-medium text-foreground leading-none text-center whitespace-nowrap">
        {action.label}
      </span>
    </button>
  );
}

export function ExecuteQuickActionsCard({ actions = DEFAULT_ACTIONS, className }: ExecuteQuickActionsCardProps) {
  return (
    <Card className={cn('flex h-[130px] flex-col overflow-hidden shadow-sm', className)}>
      <div className="shrink-0 border-b border-border px-2.5 py-1">
        <h3 className={executeSidebarUi.cardTitle}>快速操作</h3>
      </div>
      <CardContent className="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-1.5">
        <div className="grid h-full grid-cols-2 grid-rows-2 gap-1.5">
          {actions.map((action) => (
            <QuickActionButton key={action.id} action={action} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
