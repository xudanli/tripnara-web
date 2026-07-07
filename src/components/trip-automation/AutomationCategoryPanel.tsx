import {
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  Compass,
  ShieldAlert,
  Ticket,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { AutomationGroupSummary, AutomationPermissionTier } from '@/api/automation-authorization.types';
import {
  allowedTiersForAction,
  groupChipLabel,
  groupChipToStatus,
  groupIconKey,
  tierLabel,
  type AutomationFilterTab,
  type AutomationUiLevel,
} from '@/lib/trip-automation-authorization.util';
import {
  tripAutomationCategoryRow,
  tripAutomationCategoryStatusBadgeClass,
  tripAutomationSectionCard,
} from './trip-automation-ui';
import AutomationCatalogEmptyState from './AutomationCatalogEmptyState';

const CATEGORY_ICONS: Record<string, typeof Cloud> = {
  environment: Cloud,
  time_route: CalendarClock,
  activities: Compass,
  budget: Ticket,
  safety: ShieldAlert,
  team: Users,
};

interface AutomationCategoryPanelProps {
  groups: AutomationGroupSummary[];
  activeTab: AutomationFilterTab;
  onTabChange: (tab: AutomationFilterTab) => void;
  tabCounts: Record<AutomationFilterTab, number>;
  uiLevel: AutomationUiLevel;
  levelPreview?: boolean;
  onActionTierChange?: (actionKey: string, tier: AutomationPermissionTier) => void;
  catalogDegraded?: boolean;
  isCatalogRefreshing?: boolean;
  onRefreshCatalog?: () => void;
  className?: string;
}

const TAB_META: Array<{ id: AutomationFilterTab; label: string; icon: typeof CheckCircle2 }> = [
  { id: 'auto', label: '可自动执行', icon: CheckCircle2 },
  { id: 'confirm', label: '执行前需确认', icon: CalendarClock },
  { id: 'prohibited', label: '禁止执行', icon: Ban },
  { id: 'rules', label: '规则与边界', icon: ShieldAlert },
];

function ActionTierBadge({ tier }: { tier: AutomationPermissionTier }) {
  const status = groupChipToStatus(
    tier === 'AUTO'
      ? '全部自动执行'
      : tier === 'DENY'
        ? '禁止自动执行'
        : '执行前需确认',
  );
  return <span className={tripAutomationCategoryStatusBadgeClass(status)}>{tierLabel(tier)}</span>;
}

export default function AutomationCategoryPanel({
  groups,
  activeTab,
  onTabChange,
  tabCounts,
  uiLevel,
  levelPreview = false,
  onActionTierChange,
  catalogDegraded = false,
  isCatalogRefreshing,
  onRefreshCatalog,
  className,
}: AutomationCategoryPanelProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const visibleGroups =
    activeTab === 'rules'
      ? groups
      : groups
          .map((group) => ({
            ...group,
            actions: group.actions.filter((action) => {
              if (activeTab === 'auto') return action.effectiveTier === 'AUTO';
              if (activeTab === 'prohibited') return action.effectiveTier === 'DENY';
              return action.effectiveTier === 'ASK';
            }),
          }))
          .filter((group) => group.actions.length > 0);

  return (
    <section className={cn(tripAutomationSectionCard, className)}>
      <div className="border-b border-border/50 px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-foreground">按旅行任务分类查看</p>
        {levelPreview ? (
          <p className="mt-1 text-[11px] text-gate-confirm-foreground">
            下方权限为所选档位预览，点击「保存并应用规则」后生效。
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {TAB_META.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-border/80 bg-muted/25 text-foreground ring-1 ring-inset ring-foreground/10'
                    : 'border-border/50 bg-transparent text-muted-foreground hover:bg-muted/15 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {tab.label}
                <span className="font-mono-brand tabular-nums">({tabCounts[tab.id]})</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="divide-y divide-border/50">
        {catalogDegraded ? (
          <li>
            <AutomationCatalogEmptyState
              isRefreshing={isCatalogRefreshing}
              onRefresh={onRefreshCatalog}
            />
          </li>
        ) : visibleGroups.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-muted-foreground">
            当前 Tab 下暂无匹配项
          </li>
        ) : (
          visibleGroups.map((group) => {
            const iconKey = groupIconKey(group.group);
            const Icon = CATEGORY_ICONS[iconKey] ?? Cloud;
            const chip = groupChipLabel(group);
            const expanded = expandedGroup === group.group;

            return (
              <li key={group.group} className={tripAutomationCategoryRow}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/45 bg-muted/15">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-2 text-left"
                        onClick={() =>
                          setExpandedGroup(expanded ? null : group.group)
                        }
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{group.label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {group.actions.length} 项规则 · 自动 {group.autoCount} · 需确认{' '}
                            {group.askCount} · 禁止 {group.denyCount}
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <span className={tripAutomationCategoryStatusBadgeClass(groupChipToStatus(chip))}>
                      {chip}
                    </span>
                  </div>

                  {expanded ? (
                    <ul className="mt-3 space-y-2 border-t border-border/40 pt-3">
                      {group.actions.map((action) => {
                        const allowedTiers = allowedTiersForAction(action, uiLevel);
                        const tierLocked = allowedTiers.length <= 1;

                        return (
                        <li
                          key={action.key}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/45 bg-muted/8 px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">{action.label}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              {action.key}
                              {action.coldStart ? ' · 冷启动' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ActionTierBadge tier={action.effectiveTier} />
                            {onActionTierChange && !tierLocked ? (
                              <select
                                className="h-7 rounded-md border border-border/60 bg-background px-1.5 text-[10px]"
                                value={action.effectiveTier}
                                onChange={(e) =>
                                  onActionTierChange(
                                    action.key,
                                    e.target.value as AutomationPermissionTier,
                                  )
                                }
                              >
                                {allowedTiers.includes('AUTO') ? <option value="AUTO">自动</option> : null}
                                {allowedTiers.includes('ASK') ? <option value="ASK">需确认</option> : null}
                                {allowedTiers.includes('DENY') ? <option value="DENY">禁止</option> : null}
                              </select>
                            ) : tierLocked ? (
                              <span className="text-[10px] text-muted-foreground">受档位限制</span>
                            ) : null}
                          </div>
                        </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
