import { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  CalendarRange,
  Car,
  CheckCircle2,
  Clock3,
  Pencil,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import {
  formatConstraintDateRange,
  formatConstraintTravelMode,
} from '@/lib/planning-constraints.util';
import type { ConstraintPendingItem, PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import {
  PlanningDetailsPanel,
  PlanningExpandToggle,
  PlanningHeaderCopy,
  PlanningHeaderIcon,
  PlanningHeaderRow,
  PlanningHeaderSection,
  PlanningMetaChip,
  resolveConstraintsAccent,
} from './plan-studio-header-ui';

export interface PlanningConstraintsCardProps {
  summary: PlanningConstraintsSummary | null;
  loading?: boolean;
  loadSettled?: boolean;
  error?: string | null;
  onRetry?: () => void;
  confirming?: boolean;
  destinationLabel?: string;
  trip?: TripDetail | null;
  onEditPending: (item: ConstraintPendingItem) => void;
  onConfirm?: () => void;
  onOpenConflicts?: () => void;
  planningInboxCount?: number;
  compact?: boolean;
  embedded?: boolean;
  className?: string;
}

function resolvePaceLabel(trip: TripDetail | null | undefined) {
  const level = trip?.pacingConfig?.level;
  const maxActivities = trip?.pacingConfig?.maxDailyActivities;

  if (level === 'relaxed' || (maxActivities && maxActivities <= 3)) {
    return { label: '悠闲', emoji: '🌿' };
  }
  if (level === 'tight' || (maxActivities && maxActivities > 5)) {
    return { label: '紧凑', emoji: '🚀' };
  }
  return { label: '标准', emoji: '⚖️' };
}

function statusBadge(status: PlanningConstraintsSummary['budget']['status']) {
  const base = 'h-4 px-1.5 text-[9px] font-medium';
  switch (status) {
    case 'confirmed':
      return (
        <Badge variant="outline" className={cn(base, 'border-gate-allow-border text-gate-allow-foreground')}>
          已确认
        </Badge>
      );
    case 'need_confirm':
      return (
        <Badge variant="outline" className={cn(base, 'border-gate-suggest-border text-gate-suggest-foreground')}>
          待确认
        </Badge>
      );
    case 'misaligned':
      return (
        <Badge variant="outline" className={cn(base, 'border-amber-300 text-amber-800')}>
          待对齐
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={cn(base, 'text-muted-foreground')}>
          未设置
        </Badge>
      );
  }
}

interface ConstraintCellProps {
  icon: typeof CalendarRange;
  label: string;
  value: string;
  status: PlanningConstraintsSummary['budget']['status'];
  onEdit: () => void;
}

function ConstraintCell({ icon: Icon, label, value, status, onEdit }: ConstraintCellProps) {
  const isPending = status !== 'confirmed';

  return (
    <div
      className="group flex min-w-[10.5rem] max-w-full flex-1 cursor-pointer items-center gap-1.5 rounded-md py-0.5 hover:bg-muted/40"
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEdit();
        }
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] leading-tight text-foreground">
          <span className="text-muted-foreground">{label}</span>
          <span className="mx-1 text-border">·</span>
          <span className="font-medium">{value}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {statusBadge(status)}
        {isPending ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[10px] text-gate-suggest-foreground opacity-0 group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            处理
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-2.5 w-2.5" />
            <span className="sr-only">编辑{label}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function PlanningConstraintsCard({
  summary,
  loading,
  loadSettled = false,
  error,
  onRetry,
  confirming,
  destinationLabel,
  trip,
  onEditPending,
  onConfirm,
  onOpenConflicts,
  planningInboxCount = 0,
  compact = false,
  embedded = false,
  className,
}: PlanningConstraintsCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const pace = useMemo(() => resolvePaceLabel(trip), [trip]);

  useEffect(() => {
    if (summary?.needsReconfirm) setExpanded(true);
    else if (
      !embedded &&
      compact &&
      summary?.isUserConfirmed &&
      summary.pendingCount === 0
    ) {
      setExpanded(false);
    } else if (summary?.isUserConfirmed && !compact) setExpanded(false);
    else if (summary && summary.pendingCount > 0) setExpanded(true);
  }, [summary?.isUserConfirmed, summary?.needsReconfirm, summary?.pendingCount, compact, embedded]);

  const headline = useMemo(() => {
    if (!summary) return '加载约束…';
    if (summary.needsReconfirm) return '约束已变更，待重新确认';
    if (summary.isUserConfirmed) return '四项约束已对齐';
    if (summary.allReady) return '约束已齐全，待您确认';
    return `${summary.pendingCount} 项约束待处理`;
  }, [summary]);

  const compactChips = useMemo(() => {
    if (!summary) return null;
    const dateRange = formatConstraintDateRange(
      summary.timeRange.startDate,
      summary.timeRange.endDate,
      summary.timeRange.dayCount,
    );
    const budget =
      summary.budget.total != null && summary.budget.total > 0
        ? formatCurrency(summary.budget.total, summary.budget.currency)
        : null;
    const travelers = summary.travelers.count > 0 ? `${summary.travelers.count} 人` : null;
    const transport = formatConstraintTravelMode(summary.transport.travelMode);
    return { dateRange, budget, travelers, transport, pace: `${pace.emoji} ${pace.label}` };
  }, [summary, pace]);

  if ((loading || !loadSettled) && !summary) {
    return (
      <div className={cn('px-3.5 py-3 text-xs text-muted-foreground animate-pulse', className)}>
        正在加载行程约束…
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={cn('px-3.5 py-3 text-xs text-muted-foreground space-y-2', className)}>
        <p>{error?.trim() || '约束摘要暂不可用'}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onRetry()}>
            重试加载
          </Button>
        ) : null}
      </div>
    );
  }

  const accent = resolveConstraintsAccent(summary);
  const showConfirmInHeader = summary.allReady && onConfirm && !summary.isUserConfirmed;
  const showInboxLink = planningInboxCount > 0 && onOpenConflicts;
  const showCompactInline =
    compact && !expanded && summary.isUserConfirmed && !summary.needsReconfirm;

  const budgetValue =
    summary.budget.total != null && summary.budget.total > 0
      ? formatCurrency(summary.budget.total, summary.budget.currency)
      : '未设置总预算';

  const travelersValue =
    summary.travelers.count > 0
      ? summary.travelers.memberCount > 0
        ? `${summary.travelers.count} 人（团队 ${summary.travelers.memberCount} 人）`
        : `${summary.travelers.count} 人`
      : '未设置';

  const transportValue = formatConstraintTravelMode(summary.transport.travelMode);
  const dateValue = formatConstraintDateRange(
    summary.timeRange.startDate,
    summary.timeRange.endDate,
    summary.timeRange.dayCount,
  );

  const handleEdit = (key: ConstraintPendingItem['key']) => {
    const item = summary.pendingItems.find((p) => p.key === key);
    if (item) {
      onEditPending(item);
      return;
    }
    onEditPending({
      key,
      status: 'missing',
      label: key,
      editTab: key === 'travelers' ? 'team' : undefined,
      openBudgetDialog: key === 'budget',
      openIntent: key === 'transport' || key === 'travelers',
      openEditTrip: key === 'time_range',
    });
  };

  const statusIcon = summary.needsReconfirm ? AlertCircle : CheckCircle2;

  return (
    <PlanningHeaderSection accent={accent} className={className}>
      <PlanningHeaderRow>
        <PlanningHeaderIcon
          icon={summary.isUserConfirmed || summary.needsReconfirm ? statusIcon : Clock3}
          accent={accent}
        />
        <PlanningHeaderCopy kicker="固化约束" title={headline}>
          {summary.pendingCount > 0 ? (
            <Badge variant="secondary" className="h-5 shrink-0 rounded-full px-2 text-[10px]">
              {summary.pendingCount}
            </Badge>
          ) : null}
          {showCompactInline && compactChips ? (
            <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-hidden md:flex">
              {compactChips.dateRange !== '日期待补全' ? (
                <PlanningMetaChip icon={CalendarRange}>{compactChips.dateRange}</PlanningMetaChip>
              ) : null}
              {compactChips.budget ? (
                <PlanningMetaChip icon={Wallet} tone="success">
                  {compactChips.budget}
                </PlanningMetaChip>
              ) : null}
              {compactChips.travelers ? (
                <PlanningMetaChip icon={Users}>{compactChips.travelers}</PlanningMetaChip>
              ) : null}
              {compactChips.transport !== '未设置' ? (
                <PlanningMetaChip icon={Car}>{compactChips.transport}</PlanningMetaChip>
              ) : null}
              <PlanningMetaChip tone="muted">{compactChips.pace}</PlanningMetaChip>
            </div>
          ) : null}
          {!embedded && destinationLabel && !showCompactInline ? (
            <span className="truncate text-xs text-muted-foreground">{destinationLabel}</span>
          ) : null}
        </PlanningHeaderCopy>
        <div className="flex shrink-0 items-center gap-1.5">
          {showConfirmInHeader ? (
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-full px-3 text-xs shadow-sm"
              disabled={confirming}
              onClick={() => onConfirm?.()}
            >
              {confirming ? '确认中…' : '确认约束'}
            </Button>
          ) : null}
          <PlanningExpandToggle expanded={expanded} onClick={() => setExpanded((v) => !v)} />
        </div>
      </PlanningHeaderRow>

      <PlanningDetailsPanel open={expanded}>
        {summary.needsReconfirm ? (
          <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-2.5 py-2 text-xs leading-relaxed text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            您曾确认过行程约束，但之后有修改。请核对下方四项后再次确认。
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1">
          <ConstraintCell
            icon={CalendarRange}
            label="时间范围"
            value={dateValue}
            status={summary.timeRange.status}
            onEdit={() => handleEdit('time_range')}
          />
          <ConstraintCell
            icon={Wallet}
            label="预算上限"
            value={budgetValue}
            status={summary.budget.status}
            onEdit={() => handleEdit('budget')}
          />
          <ConstraintCell
            icon={Users}
            label="出行人数"
            value={travelersValue}
            status={summary.travelers.status}
            onEdit={() => handleEdit('travelers')}
          />
          <ConstraintCell
            icon={Car}
            label="基础交通"
            value={transportValue}
            status={summary.transport.status}
            onEdit={() => handleEdit('transport')}
          />
        </div>
        {showInboxLink ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-2.5 py-2">
            <p className="text-[11px] text-muted-foreground">日程与可执行性相关待办</p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-[11px] font-medium"
              onClick={onOpenConflicts}
            >
              查看 {planningInboxCount} 项规划待办 →
            </Button>
          </div>
        ) : null}
      </PlanningDetailsPanel>
    </PlanningHeaderSection>
  );
}
