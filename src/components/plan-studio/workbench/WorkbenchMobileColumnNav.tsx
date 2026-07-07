import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { WorkbenchMobileColumn } from './workbench-mobile.types';
import { workbenchMobileColumnNavList, workbenchMobileColumnNavTrigger } from './workbench-ui';

export interface WorkbenchMobileColumnNavProps {
  value: WorkbenchMobileColumn;
  onChange: (column: WorkbenchMobileColumn) => void;
  badges?: Partial<Record<WorkbenchMobileColumn, number>>;
  className?: string;
}

const COLUMNS: Array<{ value: WorkbenchMobileColumn; label: string }> = [
  { value: 'summary', label: '结论' },
  { value: 'constraints', label: '约束' },
  { value: 'itinerary', label: '行程' },
  { value: 'decision', label: '决策' },
];

/** 小屏工作台列导航 */
export function WorkbenchMobileColumnNav({
  value,
  onChange,
  badges,
  className,
}: WorkbenchMobileColumnNavProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 shrink-0 border-b border-border/70 bg-card/95 px-3 py-2 backdrop-blur-sm sm:px-4',
        className,
      )}
    >
      <div
        role="tablist"
        aria-label="规划工作台视图"
        className={workbenchMobileColumnNavList}
      >
        {COLUMNS.map((column) => {
          const isActive = value === column.value;
          const badge = badges?.[column.value] ?? 0;
          return (
            <button
              key={column.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                workbenchMobileColumnNavTrigger,
                isActive && 'bg-background font-medium text-foreground shadow-sm ring-1 ring-border/60',
              )}
              onClick={() => onChange(column.value)}
            >
              {column.label}
              {badge > 0 ? (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 min-w-[1rem] rounded-full px-1 text-[9px] tabular-nums"
                >
                  {badge > 9 ? '9+' : badge}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
