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
import { assessmentToneBorderClass } from '@/lib/frontend-constraint-card-view.util';
import { ConstraintAssessmentSummary } from './ConstraintAssessmentLaneBadges';

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
  /** P1-A · aggregateStatus 左边线（优先于 type 推断） */
  assessmentTone?: import('@/types/frontend-constraint-assessment-api.types').ConstraintAssessmentUiTone;
  contractRequirement?: string | null;
  assessmentLaneBadges?: import('@/types/frontend-constraint-assessment-api.types').ConstraintAssessmentLaneBadge[];
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
  assessmentTone,
  contractRequirement,
  assessmentLaneBadges,
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
        <p className="break-words text-xs font-medium leading-snug text-foreground">
          {label}
        </p>
      ) : null}
      {descriptionText ? (
        <p className="mt-0.5 break-words text-[10px] leading-relaxed text-muted-foreground">
          {descriptionText}
        </p>
      ) : null}
    </>
  );

  const actionButtons = (
    <>
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
    </>
  );

  const hasTrailingBadges = Boolean(value || badge || statusBadge || pendingSave || locked);
  const hasFooterActions = Boolean(onViewRepair || onEdit || onDelete);
  const footerRow =
    hasTrailingBadges || hasFooterActions ? (
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {trailingBadges}
        {actionButtons}
      </div>
    ) : null;

  return (
    <div
      className={cn(
        'group rounded-lg border px-2.5 py-2',
        assessmentTone ? assessmentToneBorderClass(assessmentTone) : null,
        selected ? 'border-foreground/15 bg-muted/50 ring-1 ring-foreground/8' : 'border-border/45 bg-muted/8',
        onSelect && !selected && 'hover:border-border/70 hover:bg-muted/15',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 w-full flex-1">
          {onSelect ? (
            <button type="button" onClick={onSelect} className="w-full text-left">
              {textBlock}
            </button>
          ) : (
            textBlock
          )}
          <ConstraintAssessmentSummary
            contractRequirement={contractRequirement}
            aggregateLabel={statusBadge?.label}
            aggregateTone={assessmentTone}
            laneBadges={assessmentLaneBadges}
            className="mt-1"
          />
          {footerRow}
        </div>
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
  const hasAssessment = Boolean(item.assessmentAggregateStatus);
  const assessmentBlocking = item.assessmentTone === 'danger';
  const isTransportItem = item.id === 'transport' || item.id === 'c_transport_mode';
  const rawDescription =
    coerceDisplayText(item.description) ||
    item.destinationRule?.judgmentRule ||
    (item.kind === 'hard' && !hasAssessment ? item.metadata?.ruleLabel : undefined);
  const description =
    isTransportItem &&
    rawDescription &&
    (rawDescription === '出行方式' || rawDescription === '基础交通方式')
      ? undefined
      : rawDescription;
  const contractRequirement =
    item.contractRequirement ??
    (hasAssessment ? item.metadata?.ruleLabel ?? item.value : undefined);

  const statusBadge = hasAssessment
    ? item.assessmentAggregateLabel
      ? {
          label: item.assessmentAggregateLabel,
          className:
            item.assessmentTone === 'danger'
              ? 'border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] text-error'
              : item.assessmentTone === 'warning'
                ? 'border-[color-mix(in_srgb,var(--color-warning)_35%,transparent)] text-[var(--color-warning)]'
                : item.assessmentTone === 'success'
                  ? 'border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] text-[var(--color-success)]'
                  : 'text-muted-foreground',
        }
      : null
    : item.statusLabel
      ? {
          label: item.statusLabel,
          className:
            conflict || item.statusTone === 'warning'
              ? 'border-border/50 text-error'
              : 'text-muted-foreground',
        }
      : null;

  const repairIssueId =
    item.assessmentRepairProblemId ?? item.checkIssueId ?? undefined;

  return {
    icon: item.icon,
    label: item.label,
    description,
    value: item.value,
    wrapContent: options.wrapContent ?? Boolean(item.destinationRule),
    statusBadge,
    assessmentTone: item.assessmentTone,
    contractRequirement,
    assessmentLaneBadges: item.assessmentLaneBadges,
    selected: options.selected,
    locked: Boolean(item.locked || item.readOnly),
    pendingSave: options.pendingSave,
    onSelect: options.onSelect,
    onEdit: options.onEdit,
    onViewRepair:
      (assessmentBlocking || conflict) && repairIssueId && options.onViewRepair
        ? () => {
            options.onViewRepair?.(repairIssueId);
          }
        : undefined,
    repairing: options.repairing,
  };
}
