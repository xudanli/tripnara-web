import { ChevronDown, ChevronUp, GripVertical, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConstraintSidebarListRow } from './ConstraintSidebarListRow';
import {
  TRAVEL_GOAL_DEFINITIONS,
  getTravelGoalDefinition,
  travelGoalRanksToWeights,
  type TravelGoalDimension,
} from '@/lib/travel-goals.util';
import { apiPrincipleToTravelGoalDimension } from '@/lib/trip-constraints-contract.util';

export interface TravelGoalsSectionProps {
  orderedIds: TravelGoalDimension[];
  displayPrinciples?: import('@/types/trip-constraints').TripConstraintsDisplayPrinciple[];
  selected?: boolean;
  onSelect?: () => void;
  onReorder?: (id: TravelGoalDimension, direction: 'up' | 'down') => void;
  compact?: boolean;
  className?: string;
}

function resolveGoalLabels(
  orderedIds: TravelGoalDimension[],
  displayPrinciples?: import('@/types/trip-constraints').TripConstraintsDisplayPrinciple[],
) {
  const labelByDimension = new Map(
    (displayPrinciples ?? []).flatMap((row) => {
      const dim = apiPrincipleToTravelGoalDimension(String(row.principle));
      return dim ? [[dim, row.label] as const] : [];
    }),
  );
  const labelFor = (id: TravelGoalDimension) =>
    labelByDimension.get(id) ?? getTravelGoalDefinition(id).label;
  return { labelFor };
}

/** 左栏 · 旅行目标摘要（点击进入右栏编辑） */
export function TravelGoalsSection({
  orderedIds,
  displayPrinciples,
  selected,
  onSelect,
  compact = true,
  className,
}: TravelGoalsSectionProps) {
  const { labelFor } = resolveGoalLabels(orderedIds, displayPrinciples);
  const topThree = orderedIds.slice(0, 3).map((id) => labelFor(id));

  if (!compact) {
    return (
      <TravelGoalsRankList
        orderedIds={orderedIds}
        displayPrinciples={displayPrinciples}
        className={className}
      />
    );
  }

  return (
    <ConstraintSidebarListRow
      icon={Target}
      label="旅行目标"
      description={`优先：${topThree.join(' → ')}${orderedIds.length > 3 ? ` · 共 ${orderedIds.length} 项` : ''}`}
      badge={{ label: `${orderedIds.length} 项`, className: 'text-muted-foreground' }}
      selected={selected}
      onSelect={onSelect}
      className={className}
    />
  );
}

export interface TravelGoalsRankListProps {
  orderedIds: TravelGoalDimension[];
  displayPrinciples?: import('@/types/trip-constraints').TripConstraintsDisplayPrinciple[];
  onReorder?: (id: TravelGoalDimension, direction: 'up' | 'down') => void;
  className?: string;
}

/** 可排序目标列表（仅右栏使用） */
export function TravelGoalsRankList({
  orderedIds,
  displayPrinciples,
  onReorder,
  className,
}: TravelGoalsRankListProps) {
  const { labelFor } = resolveGoalLabels(orderedIds, displayPrinciples);

  return (
    <ul className={cn('space-y-1.5', className)}>
      {orderedIds.map((id, index) => {
        const def = getTravelGoalDefinition(id);
        const isTop = index < 3;
        return (
          <li key={id}>
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-2',
                isTop
                  ? 'border-border/70 bg-muted/12 ring-1 ring-inset ring-foreground/8'
                  : 'border-border/50 bg-background',
              )}
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" aria-hidden />
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums',
                  isTop ? 'bg-muted text-foreground' : 'bg-muted/60 text-muted-foreground',
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{labelFor(id)}</p>
                <p className="truncate text-[10px] text-muted-foreground">{def.description}</p>
              </div>
              {isTop ? (
                <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex h-5 px-1.5 text-[9px]">
                  {index === 0 ? '首要' : '优先'}
                </Badge>
              ) : null}
              {onReorder ? (
                <div className="flex shrink-0 flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === 0}
                    aria-label={`提高 ${def.label} 优先级`}
                    onClick={() => onReorder(id, 'up')}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === orderedIds.length - 1}
                    aria-label={`降低 ${def.label} 优先级`}
                    onClick={() => onReorder(id, 'down')}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface TravelGoalsDetailPanelProps {
  orderedIds: TravelGoalDimension[];
  displayPrinciples?: import('@/types/trip-constraints').TripConstraintsDisplayPrinciple[];
  compiledLegacy?: Record<string, number> | null;
  onReorder: (id: TravelGoalDimension, direction: 'up' | 'down') => void;
  saving?: boolean;
  className?: string;
}

/** 右栏 · 旅行目标编辑（左栏仅摘要，此处为 SSOT 排序） */
export function TravelGoalsDetailPanel({
  orderedIds,
  displayPrinciples,
  compiledLegacy,
  onReorder,
  saving,
  className,
}: TravelGoalsDetailPanelProps) {
  const { labelFor } = resolveGoalLabels(orderedIds, displayPrinciples);
  const weights = travelGoalRanksToWeights(orderedIds, compiledLegacy);
  const maxWeight = Math.max(...orderedIds.map((id) => weights[id] ?? 0), 1);

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-y-auto border-l border-border/60', className)}>
      <div className="mx-auto w-full max-w-xl flex-1 p-4 lg:p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">旅行目标优先级</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            排序决定冲突时先满足哪一类目标。前 3 项对推荐方案影响最大；与下方「尽量满足」软约束共同作用。
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {orderedIds.slice(0, 3).map((id, index) => (
            <Badge
              key={id}
              variant="outline"
              className="text-[10px] font-normal text-foreground"
            >
              {index + 1}. {labelFor(id)}
            </Badge>
          ))}
        </div>

        <TravelGoalsRankList
          orderedIds={orderedIds}
          displayPrinciples={displayPrinciples}
          onReorder={onReorder}
          className="mb-5"
        />

        <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            求解器权重预览
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            相对权重（越高越不易在 trade-off 中被牺牲）
          </p>
          <ul className="mt-3 space-y-2">
            {orderedIds.map((id) => {
              const weight = weights[id] ?? 0;
              const pct = Math.round((weight / maxWeight) * 100);
              return (
                <li key={id} className="flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 truncate text-foreground/90">{labelFor(id)}</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                    {compiledLegacy ? weight.toFixed(2) : weight}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {saving ? (
          <p className="mt-3 text-[10px] text-muted-foreground">正在保存目标排序…</p>
        ) : (
          <p className="mt-3 text-[10px] text-muted-foreground">调整顺序后自动保存至决策合同</p>
        )}
      </div>
    </div>
  );
}
