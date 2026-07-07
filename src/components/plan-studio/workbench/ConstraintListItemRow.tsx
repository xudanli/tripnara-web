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
  workbenchPendingSaveBadgeClass,
  workbenchSecondaryMetric,
} from './workbench-ui';

export interface ConstraintListItemRowProps {
  item: ConstraintListEntry;
  selected?: boolean;
  /** 草稿队列中待统一保存 */
  pendingSave?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onViewRepair?: (issueId: string) => void;
  repairing?: boolean;
  trailing?: ReactNode;
  layout?: 'compact' | 'stacked';
  /** 聚焦模式：冲突项描边高亮 */
  highlightAttention?: boolean;
  className?: string;
}

export function ConstraintListItemRow({
  item,
  selected,
  pendingSave = false,
  onSelect,
  onEdit,
  onViewRepair,
  repairing,
  trailing,
  layout = 'compact',
  highlightAttention = false,
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
        {layout === 'compact' && item.value ? (
          <span className="flex min-w-0 items-center gap-1">
            <span className="block min-w-0 truncate text-xs text-foreground">
              <span className="text-foreground/85">{item.label}</span>
              <span className="mx-1 text-muted-foreground/70">·</span>
              <span className="font-medium tabular-nums">{item.value}</span>
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
        ) : (
          <>
            <span className="flex min-w-0 items-center gap-1">
              <span
                className={cn(
                  layout === 'stacked' ? workbenchConstraintListItemLabel : 'truncate text-xs font-medium text-foreground/90',
                  isSafetyCategory(item.category) && 'text-error',
                )}
              >
                {item.label}
              </span>
              {pendingSave ? (
                <Badge
                  variant="outline"
                  className={workbenchPendingSaveBadgeClass}
                >
                  待保存
                </Badge>
              ) : null}
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
                  layout === 'stacked' ? workbenchConstraintListItemValue : 'text-[11px] font-medium text-foreground/80',
                  layout === 'stacked' && valueLooksMetric && workbenchSecondaryMetric,
                  layout === 'compact' && 'block truncate',
                )}
              >
                {item.value}
              </span>
            ) : null}
          </>
        )}
      </span>
      {item.statusLabel ? (
        <Badge
          variant="outline"
          className={cn(
            'h-4 shrink-0 px-1 text-[11px] font-normal',
            conflict || item.statusTone === 'warning'
              ? 'border-border/50 text-error'
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
    layout === 'compact' && 'py-2',
    workbenchConstraintCardToneClass(item.cardTone ?? 'default'),
    workbenchConstraintConflictBorderClass(item.cardTone ?? 'default', conflict),
    selected && 'border-border/70 bg-muted/25 ring-1 ring-foreground/8',
    highlightAttention && conflict && 'ring-1 ring-gate-confirm-border/70',
    !selected && onSelect && 'hover:bg-muted/18',
    className,
  );

  if (onSelect) {
    return (
      <div
        className={rowClass}
        data-constraint-attention={highlightAttention && conflict ? 'true' : undefined}
      >
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {content}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(rowClass, 'flex items-center gap-2')}
      data-constraint-attention={highlightAttention && conflict ? 'true' : undefined}
    >
      {content}
    </div>
  );
}
