import { useCallback } from 'react';
import {
  ChevronRight,
  Cloud,
  HelpCircle,
  Leaf,
  LockKeyhole,
  Plus,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import type { ConstraintPendingKey, PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import { useWorkbenchBudgetProfile } from '@/pages/plan-studio/hooks/useWorkbenchData';
import {
  resolveConstraintSummaryEdit,
  sliderToSoftPriority,
  softPriorityLabelClass,
  SOFT_PRIORITY_TO_SLIDER,
} from './constraint-console-view.util';
import { ConstraintListEditButton } from './ConstraintListEditButton';
import { cn } from '@/lib/utils';
import {
  handleConstraintApiError,
  removeSoftConstraint,
  serviceContextFromApiList,
  updateSoftConstraintPriority,
} from '@/lib/constraint-console.service';
import { useTripConstraints } from '@/hooks/useTripConstraints';
import { useTripConstraintsCheck } from '@/hooks/useTripConstraintsCheck';
import { ConstraintListItemRow } from './ConstraintListItemRow';
import { canShowConstraintDelete, canShowConstraintEdit } from '@/lib/constraint-console-partition.util';
import { workbenchEmptySurface, workbenchPanelHeader, workbenchPanelTitle, workbenchScrollable, workbenchSliderTrack, workbenchZoneIcon } from './workbench-ui';

export interface ConstraintConsolePanelProps {
  tripId: string;
  summary: PlanningConstraintsSummary | null;
  trip?: TripDetail | null;
  loading?: boolean;
  loadSettled?: boolean;
  error?: string | null;
  onRetry?: () => void;
  conflictCount?: number;
  pendingCount?: number;
  onAddConstraint?: () => void;
  onViewAllConstraints?: () => void;
  /** 打开完整三栏约束控制台，可选预选约束 id */
  onOpenConstraintConsole?: (constraintId?: string) => void;
  /** 打开单条约束编辑弹窗（不跳转内页） */
  onEditConstraintItem?: (constraintId: string) => void;
  onEditConstraint: (key: ConstraintPendingKey) => void;
  /** 软偏好变更后递增，触发重新加载 */
  softPrefsRevision?: number;
  onSoftPrefsChanged?: () => void;
  /** 父级已拉取的 constraints 列表 */
  constraintsApiList?: import('@/types/trip-constraints').TripConstraintsListResponse | null;
  /** 父级已拉取的预算 profile */
  budgetProfile?: TripBudgetProfile | null;
  onOpenFeasibilityReport?: () => void;
  className?: string;
}

function SectionHeader({
  tone,
  icon: Icon,
  title,
  subtitle,
}: {
  tone: 'hard' | 'soft' | 'external';
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  const toneClass = {
    hard: workbenchZoneIcon.hard,
    soft: workbenchZoneIcon.soft,
    external: workbenchZoneIcon.external,
  }[tone];

  return (
    <div className="mb-1.5 flex items-start gap-1.5 px-0.5">
      <span
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
          toneClass,
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div>
        <p className="text-[11px] font-semibold leading-tight text-foreground">{title}</p>
        <p className="text-[10px] leading-tight text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

/** 约束控制台 · 摘要态（PRD §5.1 + 设计稿） */
export function ConstraintConsolePanel({
  tripId,
  summary,
  trip,
  loading,
  loadSettled,
  error,
  onRetry,
  conflictCount = 0,
  pendingCount = 0,
  onAddConstraint,
  onViewAllConstraints,
  onOpenConstraintConsole,
  onEditConstraintItem,
  onEditConstraint,
  softPrefsRevision = 0,
  onSoftPrefsChanged,
  constraintsApiList,
  budgetProfile: budgetProfileProp,
  onOpenFeasibilityReport,
  className,
}: ConstraintConsolePanelProps) {
  const budgetQuery = useWorkbenchBudgetProfile(tripId, budgetProfileProp === undefined);
  const budgetProfile = budgetProfileProp ?? budgetQuery.data ?? null;

  const constraintsCheck = useTripConstraintsCheck(tripId, {
    refreshKey: constraintsApiList?.meta?.constraintsVersion ?? softPrefsRevision,
  });

  const tripConstraints = useTripConstraints({
    tripId,
    summary,
    trip,
    budgetProfile,
    revision: softPrefsRevision,
    apiListOverride: constraintsApiList,
    checkResult: constraintsCheck.checkResult,
  });

  const { partition, softPrefs } = tripConstraints;
  const { userHardItems, userSoftItems, officialRuleItems, worldFeasibilityItem } = partition;
  const serviceCtx = serviceContextFromApiList(tripConstraints.apiList);

  const handleViewRepair = useCallback(
    (issueId: string) => {
      void (async () => {
        try {
          await constraintsCheck.runRepair(issueId);
          onOpenFeasibilityReport?.();
        } catch (err) {
          handleConstraintApiError(err, '无法加载修复方案');
        }
      })();
    },
    [constraintsCheck, onOpenFeasibilityReport],
  );

  const handleSoftPriorityChange = useCallback(
    (id: string, sliderValue: number) => {
      const priority = sliderToSoftPriority(sliderValue);
      void (async () => {
        try {
          await updateSoftConstraintPriority(tripId, id, priority, serviceCtx);
          onSoftPrefsChanged?.();
        } catch (err) {
          handleConstraintApiError(err);
        }
      })();
    },
    [tripId, serviceCtx, onSoftPrefsChanged],
  );

  const handleRemoveSoft = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await removeSoftConstraint(tripId, id, serviceCtx);
          onSoftPrefsChanged?.();
        } catch (err) {
          handleConstraintApiError(err);
        }
      })();
    },
    [tripId, serviceCtx, onSoftPrefsChanged],
  );

  const handleEditConstraintItem = (id: string) => {
    onEditConstraintItem?.(resolveConstraintSummaryEdit(id).id);
  };

  const showEmptyGuide =
    loadSettled && !loading && !summary?.allReady && userHardItems.length === 0 && userSoftItems.length === 0;

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className={workbenchPanelHeader}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <h2 className={workbenchPanelTitle}>约束与偏好</h2>
            <button
              type="button"
              className="text-muted-foreground/70 hover:text-muted-foreground"
              title="硬约束不可违反，软偏好可权衡，外部条件自动监测"
            >
              <HelpCircle className="h-3 w-3" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-6 shrink-0 gap-0.5 rounded-md px-2 text-[10px]"
            onClick={onAddConstraint}
          >
            <Plus className="h-3 w-3" />
            添加
          </Button>
        </div>
        {(conflictCount > 0 || pendingCount > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {conflictCount > 0 ? (
              <Badge variant="destructive" className="h-5 rounded-full px-2 text-[10px] font-normal">
                {conflictCount} 项冲突
              </Badge>
            ) : null}
            {pendingCount > 0 ? (
              <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">
                {pendingCount} 项待确认
              </Badge>
            ) : null}
          </div>
        )}
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto px-2.5 py-2', workbenchScrollable)}>
        {loading && !summary ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : null}

        {error && loadSettled ? (
          <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
            <p className="text-destructive">{error}</p>
            {onRetry ? (
              <Button variant="outline" size="sm" className="mt-2 h-7 text-[11px]" onClick={onRetry}>
                重试
              </Button>
            ) : null}
          </div>
        ) : null}

        {showEmptyGuide ? (
          <div className="mb-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-2.5">
            <p className="text-xs font-medium text-foreground">当前尚未设置规划边界</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              添加 3–5 个核心约束可以显著提升方案可靠性。
            </p>
            <Button
              size="sm"
              className="mt-2 h-8 w-full rounded-lg text-xs"
              onClick={onAddConstraint}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              从模板添加
            </Button>
          </div>
        ) : null}

        {/* 你的约束 */}
        <section className="mb-3">
          <SectionHeader
            tone="hard"
            icon={LockKeyhole}
            title="你的约束"
            subtitle="HARD / SOFT · 可编辑"
          />
          <ul className="space-y-2">
            {userHardItems.map((item) => (
              <li key={item.id}>
                <ConstraintListItemRow
                  item={item}
                  layout="stacked"
                  onEdit={
                    canShowConstraintEdit(item) ? () => handleEditConstraintItem(item.id) : undefined
                  }
                  onViewRepair={handleViewRepair}
                  repairing={constraintsCheck.repairing}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* 软偏好 */}
        <section className="mb-3">
          <SectionHeader tone="soft" icon={Leaf} title="软偏好" subtitle="可灵活调整" />
          <ul className="space-y-2">
            {softPrefs.length === 0 ? (
              <li className={cn(workbenchEmptySurface, 'px-3 py-4 text-center')}>
                <p className="text-xs text-muted-foreground">暂无软偏好</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-[11px]"
                  onClick={onAddConstraint}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  添加软约束
                </Button>
              </li>
            ) : (
              softPrefs.map((item) => {
                const Icon = item.icon;
                const sliderValue = SOFT_PRIORITY_TO_SLIDER[item.priority];
                const softEntry = userSoftItems.find((entry) => entry.id === item.id);
                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/45 bg-muted/8 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                        {item.label}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 shrink-0 rounded-full px-2 text-[10px] font-normal',
                          softPriorityLabelClass(item.priority),
                        )}
                      >
                        {item.priority}
                      </Badge>
                      {softEntry && canShowConstraintEdit(softEntry) ? (
                        <ConstraintListEditButton
                          label={item.label}
                          onClick={() => handleEditConstraintItem(item.id)}
                        />
                      ) : null}
                      {softEntry && canShowConstraintDelete(softEntry) ? (
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`移除 ${item.label}`}
                          onClick={() => handleRemoveSoft(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2.5 pl-5">
                      <Slider
                        value={[sliderValue]}
                        min={0}
                        max={100}
                        step={1}
                        className={cn(workbenchSliderTrack, '[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5')}
                        onValueChange={(values) => handleSoftPriorityChange(item.id, values[0] ?? 0)}
                      />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        {officialRuleItems.length > 0 ? (
          <section className="mb-3">
            <SectionHeader
              tone="external"
              icon={Cloud}
              title="目的地规则"
              subtitle="官方规则 · 只读"
            />
            <ul className="space-y-2">
              {officialRuleItems.map((item) => (
                <li key={item.id}>
                  <ConstraintListItemRow
                    item={item}
                    layout="stacked"
                    onViewRepair={handleViewRepair}
                    repairing={constraintsCheck.repairing}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {worldFeasibilityItem ? (
          <section className="mb-2">
            <SectionHeader tone="external" icon={Cloud} title="实时验证" subtitle="方案可执行性" />
            <ConstraintListItemRow item={worldFeasibilityItem} layout="stacked" />
            <div className="mt-1.5 px-1">
              {worldFeasibilityItem.lastVerifiedAt ? (
                <p className="text-[10px] text-muted-foreground">
                  上次验证：{new Date(worldFeasibilityItem.lastVerifiedAt).toLocaleString('zh-CN')}
                </p>
              ) : null}
              {worldFeasibilityItem.verificationStatus === 'OUTDATED' ? (
                <p className="text-[10px] text-gate-confirm-foreground">验证结果已过期</p>
              ) : null}
              {onOpenFeasibilityReport ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 w-full text-[11px]"
                  onClick={onOpenFeasibilityReport}
                >
                  查看可行性报告
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/50 p-2">
        <Button
          variant="outline"
          className="h-8 w-full rounded-lg text-[11px] font-medium"
          onClick={() =>
            onOpenConstraintConsole ? onOpenConstraintConsole() : onViewAllConstraints?.()
          }
        >
          查看全部条件
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
