import { cn } from '@/lib/utils';
import type { TravelStatusAutomation } from '@/api/travel-status.types';
import {
  EXPECTED_AUTOMATION_CATALOG_GROUP_COUNT,
  groupChipLabel,
  groupChipToStatus,
  resolveAutomationTabCounts,
} from '@/lib/trip-automation-authorization.util';
import { tripAutomationCategoryStatusBadgeClass } from './trip-automation-ui';

interface AutomationCatalogSummaryPanelProps {
  automation: TravelStatusAutomation;
  className?: string;
}

export default function AutomationCatalogSummaryPanel({
  automation,
  className,
}: AutomationCatalogSummaryPanelProps) {
  const catalog = automation.catalog;
  const groups = catalog?.groups ?? [];
  const tabCounts = resolveAutomationTabCounts(catalog);
  const levelLabel = automation.uiLevelLabel || automation.defaultLevelLabel;

  if (!hasAutomationCatalogSummary(automation)) return null;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/60 bg-muted/15 px-2.5 py-1 text-[11px] font-medium text-foreground">
          {levelLabel}
        </span>
        <span className="text-[11px] text-muted-foreground">
          可自动 {tabCounts.auto} · 需确认 {tabCounts.confirm} · 禁止 {tabCounts.prohibited}
        </span>
      </div>

      <ul className="space-y-2">
        {groups.map((group) => (
          <li
            key={group.group}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/8 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{group.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                自动 {group.autoCount} · 需确认 {group.askCount} · 禁止 {group.denyCount}
              </p>
            </div>
            <span
              className={tripAutomationCategoryStatusBadgeClass(
                groupChipToStatus(groupChipLabel(group)),
              )}
            >
              {groupChipLabel(group)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function hasAutomationCatalogSummary(
  automation?: TravelStatusAutomation | null,
): boolean {
  return (
    (automation?.catalog?.groups?.length ?? 0) === EXPECTED_AUTOMATION_CATALOG_GROUP_COUNT
  );
}

/** 侧栏折叠态 · AI 自动执行章节摘要 */
export function resolveAutomationSidebarSummary(
  automation?: TravelStatusAutomation | null,
): string {
  if (hasAutomationCatalogSummary(automation)) {
    return `${automation!.uiLevelLabel} · 可自动 ${automation!.tierCounts.auto} / 需确认 ${automation!.tierCounts.ask}`;
  }
  return '摘要 · 在授权中心查看与编辑自动执行策略';
}
