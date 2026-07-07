import { useEffect, useRef, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ConstraintSidebarFocusMode } from '@/lib/constraint-sidebar-focus.util';
import { getTravelGoalDefinition } from '@/lib/travel-goals.util';
import {
  workbenchColumnSurface,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchSoftSacrificedBadge,
} from './workbench-ui';
import { SoftPreferencePriorityPicker } from './SoftPreferencePriorityPicker';
import { SOFT_PREFER_SECTION_INTRO } from '@/lib/soft-constraint.util';
import { sortSoftEntriesByPriority } from '@/lib/soft-constraint.util';
import type { ConstraintListEntry } from './constraint-console-types';
import { canShowConstraintDelete, canShowConstraintEdit } from '@/lib/constraint-console-partition.util';
import { shouldShowInlineSoftSlider } from '@/lib/constraint-console-interaction.util';
import {
  groupDestinationRules,
} from '@/lib/destination-rules.util';
import { groupHardConstraints, sectionKeyToSelectionId, type ConstraintConsoleSectionViewModel } from '@/lib/trip-constraints-contract.util';
import { TRAVEL_GOALS_SECTION_ID } from '@/lib/travel-goals.util';
import type { TravelGoalDimension } from '@/types/travel-decision-contract';
import type { TripConstraintsContract } from '@/types/trip-constraints';
import { ConstraintSidebarListRow, mapConstraintEntryToSidebarRowProps } from './ConstraintSidebarListRow';
import { sliderToSoftPriority, softPriorityLabelClass } from './constraint-console-view.util';
import type { ConstraintEntryScopeContext } from '@/lib/constraint-entry-scope-context.util';
import { ConstraintEntryScopeCard } from './ConstraintEntryScopeCard';
import { ConstraintSectionIntro } from './ConstraintSectionIntro';
import { ConstraintSidebarSectionShell } from './ConstraintSidebarSectionShell';
import { ContractSectionSidebarPreview } from './ConstraintContractBlocks';
import { resolveTeamMembersSidebarSummary } from '@/lib/constraint-scope-options.util';
import { resolveAutomationSidebarSummary } from '@/components/trip-automation/AutomationCatalogSummaryPanel';
import type { TripDetail } from '@/types/trip';
import { TravelGoalsSection } from './TravelGoalsSection';

function ListSection({
  title,
  subtitle,
  count,
  onTitleClick,
  introDefaultExpanded = false,
  hideTitle = false,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  onTitleClick?: () => void;
  introDefaultExpanded?: boolean;
  hideTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mb-1">
      {!hideTitle ? (
        <div className="mb-1 px-1">
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="text-left text-[11px] font-semibold text-foreground hover:underline"
            >
              {title} {count != null && count > 0 ? count : ''}
            </button>
          ) : (
            <p className="text-[11px] font-semibold text-foreground">
              {title} {count != null && count > 0 ? count : ''}
            </p>
          )}
          {subtitle ? (
            <ConstraintSectionIntro text={subtitle} defaultExpanded={introDefaultExpanded} />
          ) : null}
        </div>
      ) : subtitle ? (
        <ConstraintSectionIntro
          text={subtitle}
          defaultExpanded={introDefaultExpanded}
          className="mb-1"
        />
      ) : null}
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}

export interface ConstraintConsoleListSidebarProps {
  sections: ConstraintConsoleSectionViewModel[];
  contract?: TripConstraintsContract | null;
  trip?: TripDetail | null;
  automationSummary?: import('@/api/travel-status.types').TravelStatusAutomation | null;
  selectedId: string | null;
  travelGoalOrderedIds: TravelGoalDimension[];
  onTravelGoalReorder?: (id: TravelGoalDimension, direction: 'up' | 'down') => void;
  onSelect: (id: string) => void;
  onEditItem?: (id: string) => void;
  onAddConstraint?: () => void;
  onSoftSliderChange?: (id: string, value: number) => void;
  onRemoveSoftPreference?: (id: string) => void;
  onViewRepair?: (issueId: string) => void;
  onOpenFeasibilityReport?: () => void;
  repairing?: boolean;
  scopeContextByEntryId?: Map<string, ConstraintEntryScopeContext>;
  focusMode?: ConstraintSidebarFocusMode;
  pendingSaveIds?: ReadonlySet<string> | string[];
  /** 侧栏标题（drawer 模式用「旅行条件」） */
  listTitle?: string;
  listSubtitle?: string;
  className?: string;
}

function renderConstraintItems(input: {
  sectionKey: string;
  items: ConstraintListEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEditItem?: (id: string) => void;
  onSoftSliderChange?: (id: string, value: number) => void;
  onRemoveSoftPreference?: (id: string) => void;
  onViewRepair?: (issueId: string) => void;
  onOpenFeasibilityReport?: () => void;
  repairing?: boolean;
  scopeContextByEntryId?: Map<string, ConstraintEntryScopeContext>;
  focusMode?: ConstraintSidebarFocusMode;
  pendingSaveIds?: ReadonlySet<string> | string[];
}) {
  const {
    sectionKey,
    items,
    selectedId,
    onSelect,
    onEditItem,
    onSoftSliderChange,
    onRemoveSoftPreference,
    onViewRepair,
    onOpenFeasibilityReport,
    repairing,
    scopeContextByEntryId,
    focusMode = 'full',
    pendingSaveIds,
  } = input;

  const isPendingSave = (id: string) => {
    if (!pendingSaveIds) return false;
    if (pendingSaveIds instanceof Set) return pendingSaveIds.has(id);
    return pendingSaveIds.includes(id);
  };

  if (items.length === 0) {
    if (sectionKey === 'hard_must_satisfy') {
      return (
        <li className="px-1 py-2 text-[11px] text-muted-foreground">
          暂无硬约束，点击「添加」从模板启用。
        </li>
      );
    }
    if (sectionKey === 'soft_prefer') {
      return <li className="px-1 py-2 text-[11px] text-muted-foreground">暂无软偏好。</li>;
    }
    return null;
  }

  if (sectionKey === 'hard_must_satisfy') {
    const hardGroups = groupHardConstraints(items);
    return (
      <>
        {hardGroups.map((group) => (
          <li key={group.key} className="space-y-1.5">
            {hardGroups.length > 1 ? (
              <p className="px-1 text-[10px] font-medium text-muted-foreground">{group.label}</p>
            ) : null}
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <ConstraintSidebarListRow
                    {...mapConstraintEntryToSidebarRowProps(item, {
                      selected: selectedId === item.id,
                      pendingSave: isPendingSave(item.id),
                      onSelect: () => onSelect(item.id),
                      onEdit: onEditItem && canShowConstraintEdit(item) ? () => onEditItem(item.id) : undefined,
                      onViewRepair,
                      repairing,
                    })}
                  />
                  {scopeContextByEntryId?.get(item.id)?.hint ? (
                    <ConstraintEntryScopeCard
                      scope={scopeContextByEntryId.get(item.id)}
                      compact
                      className="mt-0.5 px-2"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </>
    );
  }

  if (sectionKey === 'readonly_official') {
    const groups = groupDestinationRules(items);
    return (
      <>
        {groups.map((group) => (
          <li key={group.category} className="space-y-1.5">
            {groups.length > 1 ? (
              <p className="px-1 text-[10px] font-medium text-muted-foreground">{group.label}</p>
            ) : null}
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <ConstraintSidebarListRow
                    {...mapConstraintEntryToSidebarRowProps(item, {
                      selected: selectedId === item.id,
                      pendingSave: isPendingSave(item.id),
                      onSelect: () => onSelect(item.id),
                      onViewRepair,
                      repairing,
                    })}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </>
    );
  }

  if (sectionKey === 'soft_prefer') {
    const sortedItems = sortSoftEntriesByPriority(items, sliderToSoftPriority);
    const sacrificedCount = sortedItems.filter((item) => item.softSacrificed).length;
    const scopedCount = sortedItems.filter((item) => scopeContextByEntryId?.get(item.id)?.hint).length;
    return (
      <>
        {scopedCount > 0 || sacrificedCount > 0 ? (
          <li className="mb-1 px-1 text-[9px] leading-snug text-muted-foreground">
            {scopedCount > 0 ? `${scopedCount} 项有具体影响位置` : null}
            {scopedCount > 0 && sacrificedCount > 0 ? ' · ' : null}
            {sacrificedCount > 0 ? `${sacrificedCount} 项已取舍` : null}
          </li>
        ) : null}
        {sortedItems.map((item) => {
          const selected = selectedId === item.id;
          const priority = item.sliderValue != null ? sliderToSoftPriority(item.sliderValue) : '中';
          const showInlineSlider = shouldShowInlineSoftSlider(item);
          return (
            <li key={item.id} className="space-y-2">
              <ConstraintSidebarListRow
                icon={item.icon}
                label={item.label}
                description={item.description}
                badge={{ label: priority, className: softPriorityLabelClass(priority) }}
                statusBadge={
                  item.softSacrificed
                    ? { label: '已取舍', className: workbenchSoftSacrificedBadge }
                    : null
                }
                selected={selected}
                pendingSave={isPendingSave(item.id)}
                onSelect={() => onSelect(item.id)}
                onEdit={onEditItem && canShowConstraintEdit(item) ? () => onEditItem(item.id) : undefined}
                onDelete={
                  onRemoveSoftPreference && canShowConstraintDelete(item)
                    ? () => onRemoveSoftPreference(item.id)
                    : undefined
                }
              />
              {scopeContextByEntryId?.get(item.id)?.hint ? (
                <ConstraintEntryScopeCard
                  scope={scopeContextByEntryId.get(item.id)}
                  compact
                  className="px-2"
                />
              ) : null}
              {showInlineSlider && item.sliderValue != null && onSoftSliderChange ? (
                <SoftPreferencePriorityPicker
                  className="px-2"
                  sliderValue={item.sliderValue}
                  onCommit={(value) => onSoftSliderChange(item.id, value)}
                  compact
                />
              ) : null}
            </li>
          );
        })}
      </>
    );
  }

  return items.map((item) => (
    <li key={item.id}>
      <ConstraintSidebarListRow
        {...mapConstraintEntryToSidebarRowProps(item, {
          selected: selectedId === item.id,
          pendingSave: isPendingSave(item.id),
          onSelect: () => onSelect(item.id),
          onEdit: onEditItem && canShowConstraintEdit(item) ? () => onEditItem(item.id) : undefined,
          onViewRepair,
          repairing,
        })}
      />
      {sectionKey === 'readonly_world' && item.lastVerifiedAt ? (
        <div className="mt-1 px-1">
          <p className="text-[9px] text-muted-foreground">
            上次验证：{new Date(item.lastVerifiedAt).toLocaleString('zh-CN')}
          </p>
          {item.verificationStatus === 'OUTDATED' ? (
            <p className="text-[9px] text-warning">验证结果已过期，建议重新检查</p>
          ) : null}
          {onOpenFeasibilityReport ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-1.5 h-6 w-full text-[10px]"
              onClick={onOpenFeasibilityReport}
            >
              查看可行性报告
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  ));
}

export function ConstraintConsoleListSidebar({
  sections,
  contract,
  trip,
  automationSummary,
  selectedId,
  travelGoalOrderedIds,
  onTravelGoalReorder,
  onSelect,
  onEditItem,
  onAddConstraint,
  onSoftSliderChange,
  onRemoveSoftPreference,
  onViewRepair,
  onOpenFeasibilityReport,
  repairing,
  scopeContextByEntryId,
  focusMode = 'full',
  pendingSaveIds,
  listTitle = '约束控制台',
  listSubtitle = '旅行决策合同',
  className,
}: ConstraintConsoleListSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <aside className={cn('flex h-full flex-col border-r border-border/60', workbenchColumnSurface, className)}>
      <div className={cn(workbenchPanelHeader, 'flex items-center justify-between')}>
        <div className="min-w-0">
          <h2 className={workbenchPanelTitle}>{listTitle}</h2>
          <p className="text-[9px] text-muted-foreground">{listSubtitle}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-0.5 rounded-md px-2 text-[10px]"
          onClick={onAddConstraint}
        >
          <Plus className="h-3 w-3" />
          添加条件
        </Button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {sections.map((section) => {
          if (section.meta.key === 'travel_objectives' || section.contractBlock === 'objectives') {
            return (
              <ConstraintSidebarSectionShell
                key={section.meta.key}
                sectionKey={section.meta.key}
                focusMode={focusMode}
                title="旅行目标"
                count={travelGoalOrderedIds.length}
                summary={travelGoalSummary ? `优先：${travelGoalSummary}` : undefined}
              >
                <TravelGoalsSection
                  orderedIds={travelGoalOrderedIds}
                  displayPrinciples={contract?.objectives?.displayPrinciples ?? contract?.displayPrinciples}
                  selected={selectedId === TRAVEL_GOALS_SECTION_ID}
                  onSelect={() => onSelect(TRAVEL_GOALS_SECTION_ID)}
                  compact
                />
              </ConstraintSidebarSectionShell>
            );
          }

          const showContractPreview =
            section.contractBlock != null && section.contractBlock !== 'objectives';
          const showItems =
            section.items.length > 0 ||
            section.meta.key === 'hard_must_satisfy' ||
            section.meta.key === 'soft_prefer' ||
            section.meta.key === 'readonly_official';
          const hideEmptyReadonly =
            section.meta.key === 'readonly_world' && section.items.length === 0;

          if (!showContractPreview && !showItems) return null;
          if (hideEmptyReadonly) return null;

          const sectionSubtitle =
            section.meta.key === 'team_members'
              ? resolveTeamMembersSidebarSummary({
                  contract,
                  trip,
                  memberConstraintItems: section.items,
                })
              : section.meta.key === 'automation'
                ? resolveAutomationSidebarSummary(automationSummary)
                : section.meta.subtitle ?? (section.readonly ? '只读 · 系统维护' : undefined);
          const sectionHelpText =
            section.meta.key === 'soft_prefer' ? SOFT_PREFER_SECTION_INTRO : undefined;

          return (
            <ConstraintSidebarSectionShell
              key={section.meta.key}
              sectionKey={section.meta.key}
              focusMode={focusMode}
              title={
                showContractPreview && showItems
                  ? `${section.meta.label} · 约束`
                  : section.meta.label
              }
              count={section.items.length || undefined}
              summary={
                section.meta.key === 'team_members' ||
                section.meta.key === 'automation' ||
                !showItems
                  ? sectionSubtitle
                  : section.meta.subtitle
              }
              helpText={sectionHelpText}
            >
              {showContractPreview ? (
                <ContractSectionSidebarPreview
                  sectionKey={section.meta.key}
                  contractBlock={section.contractBlock!}
                  label={section.meta.label}
                  contract={contract}
                  trip={trip}
                  memberConstraintItems={section.items}
                  automationSummary={automationSummary}
                  selected={selectedId === sectionKeyToSelectionId(section.meta.key)}
                  onSelect={() => onSelect(sectionKeyToSelectionId(section.meta.key))}
                  compact
                />
              ) : null}
              {showItems ? (
                <ListSection
                  title={section.meta.label}
                  hideTitle
                  subtitle={section.meta.key === 'soft_prefer' ? undefined : sectionSubtitle}
                  introDefaultExpanded={focusMode === 'full'}
                  onTitleClick={
                    section.meta.key === 'readonly_official'
                      ? () => onSelect(sectionKeyToSelectionId(section.meta.key))
                      : undefined
                  }
                >
                  {renderConstraintItems({
                    sectionKey: section.meta.key,
                    items: section.items,
                    selectedId,
                    onSelect,
                    onEditItem,
                    onSoftSliderChange,
                    onRemoveSoftPreference,
                    onViewRepair,
                    onOpenFeasibilityReport,
                    repairing,
                    scopeContextByEntryId,
                    focusMode,
                    pendingSaveIds,
                  })}
                </ListSection>
              ) : null}
            </ConstraintSidebarSectionShell>
          );
        })}
      </div>
    </aside>
  );
}
