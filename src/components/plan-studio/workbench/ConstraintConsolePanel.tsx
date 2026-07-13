import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ChevronRight,
  HelpCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SOFT_PREFER_SECTION_INTRO } from '@/lib/soft-constraint.util';
import { Spinner } from '@/components/ui/spinner';
import type { ConstraintPendingKey, PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import { useWorkbenchBudgetProfile } from '@/pages/plan-studio/hooks/useWorkbenchData';
import {
  resolveConstraintSummaryEdit,
  softPriorityLabelClass,
} from './constraint-console-view.util';
import { cn } from '@/lib/utils';
import { coerceDisplayText } from '@/lib/coerce-display-text.util';
import { handleConstraintApiError } from '@/lib/constraint-console.service';
import { useConstraintConsoleWithAssessments } from '@/hooks/useConstraintConsoleWithAssessments';
import { useTripConstraintsCheck } from '@/hooks/useTripConstraintsCheck';
import { useTravelStatus } from '@/hooks/useTravelStatus';
import { resolveAutomationSidebarSummary } from '@/components/trip-automation/AutomationCatalogSummaryPanel';
import { ConstraintSidebarListRow, mapConstraintEntryToSidebarRowProps } from './ConstraintSidebarListRow';
import { handleConstraintConflictClick } from '@/lib/constraint-conflict-repair-flow';
import {
  sectionKeyToSelectionId,
  TRAVEL_GOALS_SECTION_ID,
} from '@/lib/trip-constraints-contract.util';
import { TravelGoalsSection } from './TravelGoalsSection';
import { ConstraintSidebarSectionShell } from './ConstraintSidebarSectionShell';
import { WorkbenchPlanningContextBlock } from './WorkbenchPlanningContextBlock';
import { SelfDriveSettingsPanel } from '@/components/plan-studio/tep';
import { getTravelGoalDefinition } from '@/lib/travel-goals.util';
import { ContractSectionSidebarPreview } from './ConstraintContractBlocks';
import {
  resolveTeamMemberDisplayCount,
  resolveTeamMembersSidebarSummary,
} from '@/lib/constraint-scope-options.util';
import {
  collectActiveExternalConditions,
  countWorkbenchPlanningConditions,
  isWorkbenchSummarySection,
  collectWorkbenchMustComplyItems,
  resolveWorkbenchSectionTitle,
  WORKBENCH_EXTERNAL_SECTION_KEY,
} from '@/lib/constraint-sidebar-focus.util';
import {
  workbenchEmptySurface,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchScrollable,
  workbenchConstraintConflictCountBadge,
} from './workbench-ui';
import { useWorkbenchDecisionFocus } from '@/contexts/WorkbenchDecisionFocusContext';
import type { ConstraintListEntry } from './constraint-console-types';

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
  /** 新 BFF：打开 decision-problem 抽屉（详情 → 方案 → 确认） */
  onOpenDecisionProblem?: (problemId: string) => void;
  /** 打开 Tasks · 规划待办收件箱 */
  onOpenPlanningInbox?: () => void;
  /** 聚焦模式：深链/决策时折叠非相关章节 */
  focusMode?: import('@/lib/constraint-sidebar-focus.util').ConstraintSidebarFocusMode;
  /** 点击冲突 badge 时进入聚焦模式 */
  onFocusAttention?: () => void;
  /** workbench：左侧摘要（仅核心章节）；full：完整列表（抽屉/控制台） */
  variant?: import('@/lib/constraint-sidebar-focus.util').ConstraintSidebarVariant;
  wishSummary?: import('@/types/trip-wishes').WishSummary | null;
  collaborators?: import('@/types/trip').Collaborator[] | null;
  onOpenCollaborationCenter?: () => void;
  onOpenBudgetTab?: () => void;
  /** P1：冰岛自驾设置 */
  selfDriveSettings?: {
    visible: boolean;
    profile?: import('@/types/trip-executability').SelfDriveProfile | null;
    constraintsWasConfirmed?: boolean;
    onSaved?: () => void | Promise<void>;
  };
  className?: string;
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
  onOpenDecisionProblem,
  onOpenPlanningInbox,
  focusMode = 'full',
  onFocusAttention,
  variant = 'workbench',
  wishSummary,
  collaborators,
  onOpenCollaborationCenter,
  onOpenBudgetTab,
  selfDriveSettings,
  className,
}: ConstraintConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const decisionFocus = useWorkbenchDecisionFocus();
  const budgetQuery = useWorkbenchBudgetProfile(tripId, budgetProfileProp === undefined);
  const budgetProfile = budgetProfileProp ?? budgetQuery.data ?? null;

  const constraintsCheck = useTripConstraintsCheck(tripId, {
    refreshKey: constraintsApiList?.meta?.constraintsVersion ?? softPrefsRevision,
  });

  const tripConstraints = useConstraintConsoleWithAssessments({
    tripId,
    summary,
    trip,
    budgetProfile,
    revision: softPrefsRevision,
    apiListOverride: constraintsApiList,
    checkResult: constraintsCheck.checkResult,
  });

  const { status: travelStatus } = useTravelStatus({ tripId, enabled: Boolean(tripId) });
  const automationSummary = travelStatus?.automation ?? null;

  const { partition, softPrefs, sections, contract, travelGoalOrderedIds } = tripConstraints;
  const { userHardItems, userSoftItems } = partition;

  const handleOpenDrawer = useCallback(
    (constraintId?: string) => {
      if (onOpenConstraintConsole) {
        onOpenConstraintConsole(constraintId);
        return;
      }
      if (constraintId && onEditConstraintItem) {
        onEditConstraintItem(resolveConstraintSummaryEdit(constraintId).id);
        return;
      }
      onViewAllConstraints?.();
    },
    [onOpenConstraintConsole, onEditConstraintItem, onViewAllConstraints],
  );

  const handleSelectItem = useCallback(
    (id: string) => {
      handleOpenDrawer(id);
    },
    [handleOpenDrawer],
  );

  const handleViewRepair = useCallback(
    (decisionProblemId: string) => {
      void (async () => {
        try {
          await handleConstraintConflictClick({
            tripId,
            decisionProblemId,
            runRepair: (id) => constraintsCheck.runRepair(id),
            onOpenDecisionProblem,
            onOpenFeasibilityReport,
          });
        } catch (err) {
          handleConstraintApiError(err, '无法加载修复方案');
        }
      })();
    },
    [constraintsCheck, onOpenFeasibilityReport, onOpenDecisionProblem, tripId],
  );

  const showEmptyGuide =
    loadSettled && !loading && !summary?.allReady && userHardItems.length === 0 && userSoftItems.length === 0;

  useEffect(() => {
    if (focusMode !== 'attention') return;
    const frame = window.requestAnimationFrame(() => {
      const target = scrollRef.current?.querySelector('[data-constraint-attention="true"]');
      target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusMode, sections]);

  const travelGoalSummary = travelGoalOrderedIds
    .slice(0, 3)
    .map((id) => getTravelGoalDefinition(id).label)
    .join(' → ');

  const visibleSections = useMemo(() => {
    if (variant === 'full') return sections;
    return sections.filter((section) => isWorkbenchSummarySection(section.meta.key));
  }, [sections, variant]);

  const workbenchPlanningLayout = useMemo(() => {
    if (variant !== 'workbench') return null;

    const softSection = sections.find((section) => section.meta.key === 'soft_prefer');
    const { tripObjectiveItems, mustComplyItems } = collectWorkbenchMustComplyItems(sections);
    const externalItems = collectActiveExternalConditions(sections);
    const conditionCount = countWorkbenchPlanningConditions({
      tripObjectiveItems,
      mustComplyItems,
      softPrefCount: softPrefs.length,
      hasTravelGoals: travelGoalOrderedIds.length > 0,
      externalCount: externalItems.length,
    });

    const tripObjectiveSummary = tripObjectiveItems
      .map((item) => item.value?.trim() || item.label)
      .filter(Boolean)
      .slice(0, 4)
      .join(' · ');
    const groupOneSummary = [tripObjectiveSummary, travelGoalSummary].filter(Boolean).join(' · ');
    const externalSummary = externalItems[0]?.label;

    return {
      tripObjectiveItems,
      mustComplyItems,
      externalItems,
      conditionCount,
      softSection,
      groupOneSummary: groupOneSummary || undefined,
      externalSummary,
    };
  }, [variant, sections, softPrefs.length, travelGoalOrderedIds.length, travelGoalSummary]);

  const handleConflictBadgeClick = useCallback(() => {
    onFocusAttention?.();
    onOpenPlanningInbox?.();
  }, [onFocusAttention, onOpenPlanningInbox]);

  const mapFocusedConstraintRowProps = useCallback(
    (
      item: ConstraintListEntry,
      options: Parameters<typeof mapConstraintEntryToSidebarRowProps>[1] = {},
    ) =>
      mapConstraintEntryToSidebarRowProps(item, {
        ...options,
        selected:
          Boolean(options.selected) ||
          Boolean(decisionFocus?.isConstraintHighlighted(item)),
      }),
    [decisionFocus],
  );

  useEffect(() => {
    if (!decisionFocus?.isActive || !scrollRef.current) return;
    const first = scrollRef.current.querySelector('[data-workbench-focus-highlight="true"]');
    first?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [decisionFocus?.isActive, decisionFocus?.focus.conflictId, decisionFocus?.focus.timelineEntryId]);

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className={workbenchPanelHeader}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <h2 className={workbenchPanelTitle}>
              {variant === 'workbench' ? '本次规划条件' : '约束控制台'}
            </h2>
            <button
              type="button"
              className="text-muted-foreground/70 hover:text-muted-foreground"
              title={
                variant === 'workbench'
                  ? '仅展示会直接影响当前行程生成与调整的上下文'
                  : '旅行决策合同：目标排序、硬边界、软偏好与官方规则'
              }
            >
              <HelpCircle className="h-3 w-3" />
            </button>
          </div>
          {variant === 'workbench' && workbenchPlanningLayout ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              AI 基于 {workbenchPlanningLayout.conditionCount} 项条件规划
            </p>
          ) : null}
          <Button
            size="sm"
            className={cn(
              'h-6 shrink-0 gap-0.5 rounded-md px-2.5 text-[10px] font-medium shadow-sm',
              workbenchPrimaryAction,
            )}
            onClick={() => handleOpenDrawer()}
          >
            编辑约束
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        {(conflictCount > 0 || pendingCount > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {conflictCount > 0 ? (
              onOpenPlanningInbox || onFocusAttention ? (
                <button type="button" onClick={handleConflictBadgeClick} className="inline-flex">
                  <Badge variant="outline" className={workbenchConstraintConflictCountBadge}>
                    {conflictCount} 项冲突
                  </Badge>
                </button>
              ) : (
                <Badge variant="outline" className={workbenchConstraintConflictCountBadge}>
                  {conflictCount} 项冲突
                </Badge>
              )
            ) : null}
            {pendingCount > 0 ? (
              onOpenPlanningInbox ? (
                <button type="button" onClick={onOpenPlanningInbox} className="inline-flex">
                  <Badge variant="outline" className="h-5 cursor-pointer rounded-full px-2 text-[10px] font-normal hover:bg-muted/60">
                    {pendingCount} 项待办
                  </Badge>
                </button>
              ) : (
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">
                  {pendingCount} 项待办
                </Badge>
              )
            ) : null}
          </div>
        )}
      </div>

      <div ref={scrollRef} className={cn('min-h-0 flex-1 overflow-y-auto px-2.5 py-2', workbenchScrollable)}>
        {decisionFocus?.isActive && decisionFocus.focus.title ? (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-primary">当前决策关联</p>
              <p className="mt-0.5 truncate text-[11px] text-foreground">{decisionFocus.focus.title}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground"
              onClick={() => decisionFocus.clearFocus()}
              aria-label="清除决策焦点"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        {loading && !summary ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : null}

        {error && loadSettled ? (
          <div className="mb-3 rounded-xl border border-border/60 bg-muted/15 p-3 text-xs">
            <p className="text-foreground">{error}</p>
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
              onClick={() => handleOpenDrawer()}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              打开旅行条件
            </Button>
          </div>
        ) : null}

        {variant === 'workbench' ? (
          <WorkbenchPlanningContextBlock
            trip={trip}
            budgetProfile={budgetProfile}
            contract={contract}
            wishSummary={wishSummary}
            collaborators={collaborators}
            onOpenCollaborationCenter={onOpenCollaborationCenter}
            onOpenBudgetTab={onOpenBudgetTab}
          />
        ) : null}

        {variant === 'workbench' && selfDriveSettings?.visible ? (
          <SelfDriveSettingsPanel
            className="mb-3"
            tripId={tripId}
            trip={trip}
            profile={selfDriveSettings.profile}
            constraintsWasConfirmed={selfDriveSettings.constraintsWasConfirmed}
            onSaved={selfDriveSettings.onSaved}
          />
        ) : null}

        {variant === 'workbench' && workbenchPlanningLayout ? (
          <>
            <ConstraintSidebarSectionShell
              sectionKey="travel_objectives"
              focusMode={focusMode}
              sidebarVariant={variant}
              title={resolveWorkbenchSectionTitle('travel_objectives', '行程目标', variant)}
              count={
                workbenchPlanningLayout.tripObjectiveItems.length +
                (travelGoalOrderedIds.length > 0 ? 1 : 0)
              }
              summary={workbenchPlanningLayout.groupOneSummary}
            >
              <ul className="space-y-1.5">
                {workbenchPlanningLayout.tripObjectiveItems.map((item) => (
                  <li
                    key={item.id}
                    data-workbench-focus-highlight={
                      decisionFocus?.isConstraintHighlighted(item) ? 'true' : undefined
                    }
                  >
                    <ConstraintSidebarListRow
                      {...mapFocusedConstraintRowProps(item, {
                        onSelect: () => handleSelectItem(item.id),
                      })}
                    />
                  </li>
                ))}
                {travelGoalOrderedIds.length > 0 ? (
                  <li>
                    <TravelGoalsSection
                      orderedIds={travelGoalOrderedIds}
                      compact
                      onSelect={() => handleOpenDrawer(TRAVEL_GOALS_SECTION_ID)}
                    />
                  </li>
                ) : null}
                {workbenchPlanningLayout.tripObjectiveItems.length === 0 &&
                travelGoalOrderedIds.length === 0 ? (
                  <li className={cn(workbenchEmptySurface, 'px-3 py-4 text-center')}>
                    <p className="text-xs text-muted-foreground">尚未设置行程目标</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-[11px]"
                      onClick={() => handleOpenDrawer()}
                    >
                      打开旅行条件
                    </Button>
                  </li>
                ) : null}
              </ul>
            </ConstraintSidebarSectionShell>

            <ConstraintSidebarSectionShell
              sectionKey="hard_must_satisfy"
              focusMode={focusMode}
              sidebarVariant={variant}
              title={resolveWorkbenchSectionTitle('hard_must_satisfy', '必须满足', variant)}
              count={workbenchPlanningLayout.mustComplyItems.length}
              summary={
                workbenchPlanningLayout.mustComplyItems.length > 0
                  ? workbenchPlanningLayout.mustComplyItems
                      .slice(0, 2)
                      .map((item) => item.label)
                      .join(' · ')
                  : undefined
              }
            >
              {workbenchPlanningLayout.mustComplyItems.length === 0 ? (
                <div className={cn(workbenchEmptySurface, 'px-3 py-4 text-center')}>
                  <p className="text-xs text-muted-foreground">暂无必须遵守的条件</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {workbenchPlanningLayout.mustComplyItems.map((item) => (
                    <li
                      key={item.id}
                      data-workbench-focus-highlight={
                        decisionFocus?.isConstraintHighlighted(item) ? 'true' : undefined
                      }
                    >
                      <ConstraintSidebarListRow
                        {...mapFocusedConstraintRowProps(item, {
                          onSelect: () => handleSelectItem(item.id),
                          onViewRepair: handleViewRepair,
                          repairing: constraintsCheck.repairing,
                        })}
                        locked={Boolean(item.locked || item.readOnly || item.kind === 'hard')}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </ConstraintSidebarSectionShell>

            {workbenchPlanningLayout.softSection ? (
              <ConstraintSidebarSectionShell
                sectionKey="soft_prefer"
                focusMode={focusMode}
                sidebarVariant={variant}
                title={resolveWorkbenchSectionTitle(
                  'soft_prefer',
                  workbenchPlanningLayout.softSection.meta.label,
                  variant,
                )}
                count={softPrefs.length}
                summary={workbenchPlanningLayout.softSection.meta.subtitle}
                helpText={SOFT_PREFER_SECTION_INTRO}
              >
                <section className="mb-1">
                  <ul className="space-y-1.5">
                    {softPrefs.length === 0 ? (
                      <li className={cn(workbenchEmptySurface, 'px-3 py-4 text-center')}>
                        <p className="text-xs text-muted-foreground">暂无软偏好</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-[11px]"
                          onClick={() => handleOpenDrawer()}
                        >
                          打开旅行条件
                        </Button>
                      </li>
                    ) : (
                      softPrefs.map((item) => {
                        const softEntry = userSoftItems.find((entry) => entry.id === item.id);
                        return (
                          <li key={item.id}>
                            <ConstraintSidebarListRow
                              icon={item.icon}
                              label={item.label}
                              description={coerceDisplayText(softEntry?.description)}
                              badge={{
                                label: item.priority,
                                className: softPriorityLabelClass(item.priority),
                              }}
                              onSelect={() => handleSelectItem(item.id)}
                            />
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              </ConstraintSidebarSectionShell>
            ) : null}

            {workbenchPlanningLayout.externalItems.length > 0 ? (
              <ConstraintSidebarSectionShell
                sectionKey={WORKBENCH_EXTERNAL_SECTION_KEY}
                focusMode={focusMode}
                sidebarVariant={variant}
                title={resolveWorkbenchSectionTitle(
                  WORKBENCH_EXTERNAL_SECTION_KEY,
                  '当前影响规划',
                  variant,
                )}
                count={workbenchPlanningLayout.externalItems.length}
                summary={workbenchPlanningLayout.externalSummary ?? undefined}
              >
                <ul className="space-y-1.5">
                  {workbenchPlanningLayout.externalItems.map((item) => (
                    <li
                      key={item.id}
                      data-workbench-focus-highlight={
                        decisionFocus?.isConstraintHighlighted(item) ? 'true' : undefined
                      }
                    >
                      <ConstraintSidebarListRow
                        {...mapFocusedConstraintRowProps(item, {
                          onSelect: () => handleSelectItem(item.id),
                          onViewRepair: handleViewRepair,
                          repairing: constraintsCheck.repairing,
                          wrapContent: true,
                        })}
                      />
                    </li>
                  ))}
                </ul>
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
              </ConstraintSidebarSectionShell>
            ) : null}

            <button
              type="button"
              className="mt-1 w-full rounded-lg border border-dashed border-border/70 bg-muted/15 px-2.5 py-2.5 text-left text-[11px] leading-relaxed text-muted-foreground hover:bg-muted/25"
              onClick={() => handleOpenDrawer()}
            >
              查看完整上下文
              <ChevronRight className="ml-0.5 inline h-3 w-3 align-middle" aria-hidden />
            </button>
          </>
        ) : null}

        {variant !== 'workbench'
          ? visibleSections.map((section) => {
          if (section.meta.key === 'travel_objectives') {
            return (
              <ConstraintSidebarSectionShell
                key={section.meta.key}
                sectionKey={section.meta.key}
                focusMode={focusMode}
                sidebarVariant={variant}
                title="旅行目标"
                count={travelGoalOrderedIds.length}
                summary={travelGoalSummary ? `优先：${travelGoalSummary}` : undefined}
              >
                <TravelGoalsSection
                  orderedIds={travelGoalOrderedIds}
                  compact
                  onSelect={() => handleOpenDrawer(TRAVEL_GOALS_SECTION_ID)}
                />
              </ConstraintSidebarSectionShell>
            );
          }

          if (section.contractBlock) {
            const isTeamSection = section.meta.key === 'team_members';
            const isAutomationSection = section.meta.key === 'automation';
            const teamSummary = isTeamSection
              ? resolveTeamMembersSidebarSummary({
                  contract,
                  trip,
                  memberConstraintItems: section.items,
                })
              : section.meta.subtitle;
            const teamCount = isTeamSection
              ? resolveTeamMemberDisplayCount(
                  contract?.teamGovernance,
                  trip,
                  section.items,
                ) || undefined
              : undefined;
            const sectionSummary = isTeamSection
              ? teamSummary
              : isAutomationSection
                ? resolveAutomationSidebarSummary(automationSummary)
                : section.meta.subtitle;

            return (
              <ConstraintSidebarSectionShell
                key={section.meta.key}
                sectionKey={section.meta.key}
                focusMode={focusMode}
                sidebarVariant={variant}
                title={section.meta.label}
                count={teamCount}
                summary={sectionSummary}
              >
                <ContractSectionSidebarPreview
                  sectionKey={section.meta.key}
                  contractBlock={section.contractBlock}
                  label={section.meta.label}
                  contract={contract}
                  trip={trip}
                  memberConstraintItems={section.items}
                  automationSummary={automationSummary}
                  onSelect={() =>
                    handleOpenDrawer(sectionKeyToSelectionId(section.meta.key))
                  }
                  compact
                />
                {isTeamSection && section.items.length > 0 ? (
                  <ul className="mt-1.5 space-y-1.5">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <ConstraintSidebarListRow
                          {...mapConstraintEntryToSidebarRowProps(item, {
                            onSelect: () => handleSelectItem(item.id),
                          })}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </ConstraintSidebarSectionShell>
            );
          }

          if (section.meta.key === 'soft_prefer') {
            return (
              <ConstraintSidebarSectionShell
                key={section.meta.key}
                sectionKey={section.meta.key}
                focusMode={focusMode}
                sidebarVariant={variant}
                title={section.meta.label}
                count={softPrefs.length}
                summary={section.meta.subtitle}
                helpText={SOFT_PREFER_SECTION_INTRO}
              >
              <section className="mb-1">
                <ul className="space-y-1.5">
                  {softPrefs.length === 0 ? (
                    <li className={cn(workbenchEmptySurface, 'px-3 py-4 text-center')}>
                      <p className="text-xs text-muted-foreground">暂无软偏好</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-[11px]"
                        onClick={() => handleOpenDrawer()}
                      >
                        打开旅行条件
                      </Button>
                    </li>
                  ) : (
                    softPrefs.map((item) => {
                      const softEntry = userSoftItems.find((entry) => entry.id === item.id);
                      return (
                        <li key={item.id}>
                          <ConstraintSidebarListRow
                            icon={item.icon}
                            label={item.label}
                            description={coerceDisplayText(softEntry?.description)}
                            badge={{
                              label: item.priority,
                              className: softPriorityLabelClass(item.priority),
                            }}
                            onSelect={() => handleSelectItem(item.id)}
                          />
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
              </ConstraintSidebarSectionShell>
            );
          }

          if (section.items.length === 0) return null;

          return (
            <ConstraintSidebarSectionShell
              key={section.meta.key}
              sectionKey={section.meta.key}
              focusMode={focusMode}
              sidebarVariant={variant}
              title={section.meta.label}
              count={section.items.length}
              summary={section.meta.subtitle}
            >
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <ConstraintSidebarListRow
                      {...mapConstraintEntryToSidebarRowProps(item, {
                        onSelect: () => handleSelectItem(item.id),
                        onViewRepair: handleViewRepair,
                        repairing: constraintsCheck.repairing,
                      })}
                    />
                  </li>
                ))}
              </ul>
              {section.meta.key === 'readonly_world' && onOpenFeasibilityReport ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 w-full text-[11px]"
                  onClick={onOpenFeasibilityReport}
                >
                  查看可行性报告
                </Button>
              ) : null}
            </ConstraintSidebarSectionShell>
          );
        })
          : null}
      </div>
    </div>
  );
}
