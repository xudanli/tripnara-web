import type { LucideIcon } from 'lucide-react';
import { Lock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { coerceDisplayText } from '@/lib/coerce-display-text.util';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ConstraintListEntry } from './constraint-console-types';
import { hasConstraintConflict } from '@/lib/constraint-console-partition.util';
import { ConstraintListEditButton } from './ConstraintListEditButton';
import { workbenchPendingSaveBadgeClass } from './workbench-ui';

export interface ConstraintSidebarListRowProps {
  icon: LucideIcon;
  label: string;
  description?: string | null;
  /** 章节标题已在上方展示时，仅显示描述 */
  showLabel?: boolean;
  value?: string | null;
  badge?: { label: string; className?: string } | null;
  statusBadge?: { label: string; className?: string } | null;
  selected?: boolean;
  locked?: boolean;
  pendingSave?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewRepair?: () => void;
  repairing?: boolean;
  /** 正文换行展示，徽章移到正文下方（窄侧栏下的目的地规则等） */
  wrapContent?: boolean;
  className?: string;
}

/** 侧栏 / 抽屉 · 约束摘要行（与「尽量满足」同构） */
export function ConstraintSidebarListRow({
  icon: Icon,
  label,
  description,
  showLabel = true,
  value,
  badge,
  statusBadge,
  selected = false,
  locked = false,
  pendingSave = false,
  onSelect,
  onEdit,
  onDelete,
  onViewRepair,
  repairing = false,
  wrapContent = false,
  className,
}: ConstraintSidebarListRowProps) {
  const descriptionText = coerceDisplayText(description);
  const trailingBadges = (
    <>
      {value ? (
        <Badge
          variant="outline"
          className="h-5 shrink-0 rounded-full px-2 text-[10px] font-normal tabular-nums text-foreground"
        >
          {value}
        </Badge>
      ) : null}
      {badge ? (
        <Badge
          variant="outline"
          className={cn('h-5 shrink-0 rounded-full px-2 text-[10px] font-normal', badge.className)}
        >
          {badge.label}
        </Badge>
      ) : null}
      {statusBadge ? (
        <Badge
          variant="outline"
          className={cn('h-5 shrink-0 rounded-full px-2 text-[10px] font-normal', statusBadge.className)}
        >
          {statusBadge.label}
        </Badge>
      ) : null}
      {pendingSave ? (
        <Badge
          variant="outline"
          className={workbenchPendingSaveBadgeClass}
        >
          待保存
        </Badge>
      ) : null}
      {locked ? <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden /> : null}
    </>
  );

  const textBlock = (
    <>
      {showLabel ? (
        <p
          className={cn(
            'text-xs font-medium text-foreground',
            wrapContent ? 'leading-snug' : 'truncate',
          )}
        >
          {label}
        </p>
      ) : null}
      {descriptionText ? (
        <p
          className={cn(
            'text-[10px] text-muted-foreground',
            wrapContent ? 'mt-0.5 leading-relaxed' : 'leading-snug line-clamp-2',
            showLabel && !wrapContent && 'mt-0.5',
          )}
        >
          {descriptionText}
        </p>
      ) : null}
    </>
  );

  if (wrapContent) {
    return (
      <div
        className={cn(
          'group rounded-lg border px-2.5 py-2',
          selected ? 'border-foreground/15 bg-muted/50 ring-1 ring-foreground/8' : 'border-border/45 bg-muted/8',
          onSelect && !selected && 'hover:border-border/70 hover:bg-muted/15',
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            {onSelect ? (
              <button type="button" onClick={onSelect} className="w-full text-left">
                {textBlock}
              </button>
            ) : (
              textBlock
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1">{trailingBadges}</div>
          </div>
          {onViewRepair ? (
            <Button
              variant="outline"
              size="sm"
              className="h-6 shrink-0 px-2 text-[10px]"
              disabled={repairing}
              onClick={onViewRepair}
            >
              查看修复
            </Button>
          ) : null}
          {onEdit ? <ConstraintListEditButton label={label} onClick={onEdit} /> : null}
          {onDelete ? (
            <button
              type="button"
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`移除 ${label}`}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group rounded-lg border px-2.5 py-2',
        selected ? 'border-foreground/15 bg-muted/50 ring-1 ring-foreground/8' : 'border-border/45 bg-muted/8',
        onSelect && !selected && 'hover:border-border/70 hover:bg-muted/15',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          {onSelect ? (
            <button type="button" onClick={onSelect} className="w-full text-left">
              {textBlock}
            </button>
          ) : (
            textBlock
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">{trailingBadges}</div>
        {onViewRepair ? (
          <Button
            variant="outline"
            size="sm"
            className="h-6 shrink-0 px-2 text-[10px]"
            disabled={repairing}
            onClick={onViewRepair}
          >
            查看修复
          </Button>
        ) : null}
        {onEdit ? <ConstraintListEditButton label={label} onClick={onEdit} /> : null}
        {onDelete ? (
          <button
            type="button"
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`移除 ${label}`}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function mapConstraintEntryToSidebarRowProps(
  item: ConstraintListEntry,
  options: {
    selected?: boolean;
    pendingSave?: boolean;
    repairing?: boolean;
    onSelect?: () => void;
    onEdit?: () => void;
    onViewRepair?: (issueId: string) => void;
    wrapContent?: boolean;
  } = {},
): ConstraintSidebarListRowProps {
  const conflict = hasConstraintConflict(item);
  const description =
    coerceDisplayText(item.description) ||
    item.destinationRule?.judgmentRule ||
    (item.kind === 'hard' ? item.metadata?.ruleLabel : undefined);
  return {
    icon: item.icon,
    label: item.label,
    description,
    value: item.value,
    wrapContent: options.wrapContent ?? Boolean(item.destinationRule),
    statusBadge: item.statusLabel
      ? {
          label: item.statusLabel,
          className:
            conflict || item.statusTone === 'warning'
              ? 'border-border/50 text-error'
              : 'text-muted-foreground',
        }
      : null,
    selected: options.selected,
    locked: Boolean(item.locked || item.readOnly),
    pendingSave: options.pendingSave,
    onSelect: options.onSelect,
    onEdit: options.onEdit,
    onViewRepair:
      conflict && item.checkIssueId && options.onViewRepair
        ? () => {
            options.onViewRepair?.(item.checkIssueId!);
          }
        : undefined,
    repairing: options.repairing,
  };
}
