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
import { WorkbenchConfirmPanel } from '@/components/plan-studio/workbench/WorkbenchConfirmPanel';
import {
  formatConstraintDateRange,
  formatConstraintTravelMode,
  formatConstraintTravelersLabel,
} from '@/lib/planning-constraints.util';
import type {
  ConstraintPendingKey,
  PlanningConstraintsSummary,
} from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import { useConstraintFlexibility } from '@/hooks/useConstraintFlexibility';
import {
  constraintFlexibilityLabel,
  type ConstraintFlexKey,
  type ConstraintFlexibilityLevel,
} from '@/lib/constraint-flexibility.util';
import { formatConstraintImpactLabel } from '@/lib/constraint-matrix-impact.util';
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
  onEditConstraint: (key: ConstraintPendingKey) => void;
  onConfirm?: () => void;
  onOpenConflicts?: () => void;
  /** 规划待办链接文案（默认「查看规划待办 →」；BFF 可用时为「去决策 →」） */
  planningActionsLabel?: string;
  /** 冲突态：滚动至松弛建议条（PRD §16.2） */
  onScrollToRelaxation?: () => void;
  planningInboxCount?: number;
  /** 有规划待办时默认收起，主 CTA 交给 Decision Strip */
  deferToPlanningInbox?: boolean;
  /** 用于本地持久化约束硬/软/可协商标注（M2） */
  tripId?: string | null;
  compact?: boolean;
  embedded?: boolean;
  /** 与方案矩阵并排时的左列（桌面 ≥1024px） */
  layoutColumn?: 'start';
  /** 矩阵 diff 计数：约束 → 影响方案数（M2） */
  constraintImpactByKey?: Partial<Record<ConstraintFlexKey, number>>;
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

function statusBadge(
  status: PlanningConstraintsSummary['budget']['status'],
  onConflictClick?: () => void,
) {
  const base = 'h-4 px-1.5 text-[9px] font-medium';
  const conflictInteractive = onConflictClick
    ? 'cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
    : '';
  switch (status) {
    case 'confirmed':
      return (
        <Badge variant="outline" className={cn(base, 'border-border text-success')}>
          已确认
        </Badge>
      );
    case 'need_confirm':
      return (
        <Badge variant="outline" className={cn(base, 'border-border text-foreground')}>
          待确认
        </Badge>
      );
    case 'misaligned':
      return (
        <Badge
          variant="outline"
          role={onConflictClick ? 'button' : undefined}
          tabIndex={onConflictClick ? 0 : undefined}
          className={cn(base, 'border-border text-warning', conflictInteractive)}
          onClick={
            onConflictClick
              ? (event) => {
                  event.stopPropagation();
                  onConflictClick();
                }
              : undefined
          }
          onKeyDown={
            onConflictClick
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onConflictClick();
                  }
                }
              : undefined
          }
        >
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

function flexibilityBadgeClass(level: ConstraintFlexibilityLevel) {
  const base = 'h-4 px-1.5 text-[9px] font-medium cursor-pointer hover:opacity-80';
  switch (level) {
    case 'soft':
      return cn(base, 'border-border text-muted-foreground dark:text-muted-foreground');
    case 'negotiable':
      return cn(base, 'border-border text-foreground');
    default:
      return cn(base, 'text-muted-foreground');
  }
}

interface ConstraintCellProps {
  icon: typeof CalendarRange;
  label: string;
  value: string;
  status: PlanningConstraintsSummary['budget']['status'];
  onEdit: () => void;
  flexKey?: ConstraintFlexKey;
  flexibilityLevel?: ConstraintFlexibilityLevel;
  onCycleFlexibility?: () => void;
  stacked?: boolean;
  impactCount?: number;
  onConflictClick?: () => void;
}

function ConstraintCell({
  icon: Icon,
  label,
  value,
  status,
  onEdit,
  flexKey,
  flexibilityLevel = 'hard',
  onCycleFlexibility,
  stacked = false,
  impactCount,
  onConflictClick,
}: ConstraintCellProps) {
  const isPending = status !== 'confirmed';

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-1.5 rounded-md py-0.5 hover:bg-muted/40',
        stacked ? 'min-w-0 w-full max-w-full flex-1' : 'min-w-[10.5rem] max-w-full flex-1',
      )}
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
        {impactCount != null && impactCount > 0 ? (
          <Badge
            variant="outline"
            className="h-4 px-1.5 text-[9px] font-normal text-muted-foreground"
            title="该约束在方案矩阵中存在差值"
          >
            {formatConstraintImpactLabel(impactCount)}
          </Badge>
        ) : null}
        {flexKey && onCycleFlexibility ? (
          <Badge
            variant="outline"
            className={flexibilityBadgeClass(flexibilityLevel)}
            title="点击切换：硬 / 软 / 可协商"
            onClick={(event) => {
              event.stopPropagation();
              onCycleFlexibility();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onCycleFlexibility();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {constraintFlexibilityLabel(flexibilityLevel)}
          </Badge>
        ) : null}
        {statusBadge(status, status === 'misaligned' ? onConflictClick : undefined)}
        {isPending ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[10px] text-foreground opacity-0 group-hover:opacity-100"
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
  onEditConstraint,
  onConfirm,
  onOpenConflicts,
  planningActionsLabel = '查看规划待办 →',
  onScrollToRelaxation,
  planningInboxCount = 0,
  deferToPlanningInbox = false,
  tripId = null,
  compact = false,
  embedded = false,
  layoutColumn,
  constraintImpactByKey,
  className,
}: PlanningConstraintsCardProps) {
  const isSideColumn = layoutColumn === 'start';
  const [expanded, setExpanded] = useState(!compact);
  const [reconfirmSignedOff, setReconfirmSignedOff] = useState(false);
  const { levels: flexibilityLevels, cycleFlexibility } = useConstraintFlexibility(tripId);
  const pace = useMemo(() => resolvePaceLabel(trip), [trip]);

  useEffect(() => {
    if (deferToPlanningInbox && planningInboxCount > 0 && !summary?.needsReconfirm) {
      setExpanded(false);
      return;
    }
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
  }, [
    summary?.isUserConfirmed,
    summary?.needsReconfirm,
    summary?.pendingCount,
    compact,
    embedded,
    deferToPlanningInbox,
    planningInboxCount,
  ]);

  useEffect(() => {
    if (!summary?.needsReconfirm) setReconfirmSignedOff(false);
  }, [summary?.needsReconfirm]);

  const reconfirmItems = useMemo(
    () =>
      summary?.needsReconfirm
        ? [
            '我已核对时间范围是否与当前行程一致',
            '我已核对预算上限是否仍符合预期',
            '我已核对出行人数与协作成员',
            '我已核对基础交通方式与约束',
          ]
        : [],
    [summary?.needsReconfirm],
  );

  const headline = useMemo(() => {
    if (!summary) return '加载约束…';
    if (summary.needsReconfirm) return '约束已变更，待重新确认';
    if (summary.isUserConfirmed) return '四项约束已对齐';
    if (summary.allReady) return '约束已齐全，待您确认';
    if (planningInboxCount > 0 && summary.pendingCount > 0) {
      return `${summary.pendingCount} 项基础约束 · 共 ${planningInboxCount} 项待办`;
    }
    if (planningInboxCount > 0 && summary.pendingCount === 0) {
      return `基础约束已齐 · ${planningInboxCount} 项日程待办`;
    }
    return `${summary.pendingCount} 项约束待处理`;
  }, [summary, planningInboxCount]);

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
  const reconfirmBlocked = summary.needsReconfirm && !reconfirmSignedOff;
  const showInboxLink = planningInboxCount > 0 && onOpenConflicts;
  const showCompactInline =
    compact && !expanded && summary.isUserConfirmed && !summary.needsReconfirm;

  const budgetValue =
    summary.budget.total != null && summary.budget.total > 0
      ? formatCurrency(summary.budget.total, summary.budget.currency)
      : '未设置总预算';

  const travelersValue = formatConstraintTravelersLabel(summary.travelers);

  const transportValue = formatConstraintTravelMode(summary.transport.travelMode);
  const dateValue = formatConstraintDateRange(
    summary.timeRange.startDate,
    summary.timeRange.endDate,
    summary.timeRange.dayCount,
  );

  const handleEdit = (key: ConstraintPendingKey) => {
    onEditConstraint(key);
  };

  const statusIcon = summary.needsReconfirm ? AlertCircle : CheckCircle2;

  return (
    <PlanningHeaderSection accent={accent} className={cn(isSideColumn && 'h-full', className)}>
      <PlanningHeaderRow className={cn(isSideColumn && 'px-3 py-2')}>
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
          {showCompactInline && compactChips && !isSideColumn ? (
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
              disabled={confirming || reconfirmBlocked}
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
          <WorkbenchConfirmPanel
            status="NEED_CONFIRM"
            riskExplanation="您曾确认过行程约束，但之后有修改。请核对下方四项并逐项签收后再确认。"
            confirmations={reconfirmItems}
            onAllConfirmedChange={setReconfirmSignedOff}
            className="border-0 shadow-none"
          />
        ) : null}
        <div
          className={cn(
            'flex items-center justify-start gap-x-3 gap-y-1',
            isSideColumn ? 'flex-col items-stretch gap-1.5' : 'flex-wrap',
          )}
        >
          <ConstraintCell
            icon={CalendarRange}
            label="时间范围"
            value={dateValue}
            status={summary.timeRange.status}
            onEdit={() => handleEdit('time_range')}
            flexKey="time_range"
            flexibilityLevel={flexibilityLevels.time_range ?? 'hard'}
            onCycleFlexibility={() => cycleFlexibility('time_range')}
            stacked={isSideColumn}
            impactCount={constraintImpactByKey?.time_range}
            onConflictClick={onScrollToRelaxation}
          />
          <ConstraintCell
            icon={Wallet}
            label="预算上限"
            value={budgetValue}
            status={summary.budget.status}
            onEdit={() => handleEdit('budget')}
            flexKey="budget"
            flexibilityLevel={flexibilityLevels.budget ?? 'hard'}
            onCycleFlexibility={() => cycleFlexibility('budget')}
            stacked={isSideColumn}
            impactCount={constraintImpactByKey?.budget}
            onConflictClick={onScrollToRelaxation}
          />
          <ConstraintCell
            icon={Users}
            label="出行人数"
            value={travelersValue}
            status={summary.travelers.status}
            onEdit={() => handleEdit('travelers')}
            flexKey="travelers"
            flexibilityLevel={flexibilityLevels.travelers ?? 'hard'}
            onCycleFlexibility={() => cycleFlexibility('travelers')}
            stacked={isSideColumn}
            impactCount={constraintImpactByKey?.travelers}
            onConflictClick={onScrollToRelaxation}
          />
          <ConstraintCell
            icon={Car}
            label="基础交通"
            value={transportValue}
            status={summary.transport.status}
            onEdit={() => handleEdit('transport')}
            flexKey="transport"
            flexibilityLevel={flexibilityLevels.transport ?? 'hard'}
            onCycleFlexibility={() => cycleFlexibility('transport')}
            stacked={isSideColumn}
            impactCount={constraintImpactByKey?.transport}
            onConflictClick={onScrollToRelaxation}
          />
        </div>
        {showInboxLink ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-2.5 py-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {onScrollToRelaxation
                ? '约束或日程冲突待处理，可先查看下方松弛建议'
                : '日程与可执行性待办（与上方基础约束分开统计）'}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {onScrollToRelaxation ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-[11px] font-medium"
                  onClick={onScrollToRelaxation}
                >
                  查看松弛建议 →
                </Button>
              ) : null}
              {onOpenConflicts ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-[11px] font-medium"
                  onClick={onOpenConflicts}
                >
                  {planningActionsLabel}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </PlanningDetailsPanel>
    </PlanningHeaderSection>
  );
}
