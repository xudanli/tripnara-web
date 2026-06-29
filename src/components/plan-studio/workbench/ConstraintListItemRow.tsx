import type { ReactNode } from 'react';
import { HelpCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ConstraintListEntry } from './constraint-console-types';
import {
  buildConstraintHelpTooltip,
  canShowConstraintEdit,
  hasConstraintConflict,
  isSafetyCategory,
} from '@/lib/constraint-console-partition.util';
import { ConstraintListEditButton } from './ConstraintListEditButton';
import {
  workbenchConstraintCardToneClass,
  workbenchConstraintConflictBorderClass,
  workbenchConstraintIconToneClass,
  workbenchConstraintListItem,
  workbenchConstraintListItemIcon,
  workbenchConstraintListItemLabel,
  workbenchConstraintListItemValue,
  workbenchSecondaryMetric,
} from './workbench-ui';

export interface ConstraintListItemRowProps {
  item: ConstraintListEntry;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onViewRepair?: (issueId: string) => void;
  repairing?: boolean;
  trailing?: ReactNode;
  layout?: 'compact' | 'stacked';
  className?: string;
}

export function ConstraintListItemRow({
  item,
  selected,
  onSelect,
  onEdit,
  onViewRepair,
  repairing,
  trailing,
  layout = 'compact',
  className,
}: ConstraintListItemRowProps) {
  const Icon = item.icon;
  const conflict = hasConstraintConflict(item);
  const showEdit = onEdit && canShowConstraintEdit(item);
  const helpTooltip = buildConstraintHelpTooltip(item);
  const valueLooksMetric =
    typeof item.value === 'string' && /[\d¥￥$km小时天]/.test(item.value);

  const content = (
    <>
      <span
        className={cn(
          workbenchConstraintListItemIcon,
          layout === 'compact' ? 'h-7 w-7' : 'h-8 w-8',
          workbenchConstraintIconToneClass(item.cardTone ?? 'default'),
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1">
          <span
            className={cn(
              layout === 'stacked' ? workbenchConstraintListItemLabel : 'truncate text-xs',
              isSafetyCategory(item.category) && 'text-gate-reject-foreground',
            )}
          >
            {item.label}
          </span>
          {helpTooltip ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
                    aria-label="规则说明"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap text-xs">
                  {helpTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </span>
        {item.value ? (
          <span
            className={cn(
              layout === 'stacked' ? workbenchConstraintListItemValue : 'text-[10px] text-muted-foreground',
              layout === 'stacked' && valueLooksMetric && workbenchSecondaryMetric,
              layout === 'compact' && 'block truncate',
            )}
          >
            {item.value}
          </span>
        ) : null}
      </span>
      {item.statusLabel ? (
        <Badge
          variant="outline"
          className={cn(
            'h-4 shrink-0 px-1 text-[9px] font-normal',
            conflict || item.statusTone === 'warning'
              ? 'border-gate-reject-border/50 text-gate-reject-foreground'
              : 'text-muted-foreground',
          )}
        >
          {item.statusLabel}
        </Badge>
      ) : null}
      {item.locked || item.readOnly ? (
        <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />
      ) : null}
      {conflict && item.checkIssueId && onViewRepair ? (
        <Button
          variant="outline"
          size="sm"
          className="h-6 shrink-0 px-2 text-[10px]"
          disabled={repairing}
          onClick={(e) => {
            e.stopPropagation();
            onViewRepair(item.checkIssueId!);
          }}
        >
          查看修复
        </Button>
      ) : null}
      {showEdit ? <ConstraintListEditButton label={item.label} onClick={onEdit} /> : null}
      {trailing}
    </>
  );

  const rowClass = cn(
    workbenchConstraintListItem,
    workbenchConstraintCardToneClass(item.cardTone ?? 'default'),
    workbenchConstraintConflictBorderClass(item.cardTone ?? 'default', conflict),
    selected && 'border-border/70 bg-muted/25 ring-1 ring-foreground/8',
    !selected && onSelect && 'hover:bg-muted/18',
    className,
  );

  if (onSelect) {
    return (
      <div className={rowClass}>
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {content}
        </button>
      </div>
    );
  }

  return <div className={cn(rowClass, 'flex items-center gap-2')}>{content}</div>;
}
