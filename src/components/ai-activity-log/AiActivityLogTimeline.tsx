import {
  CalendarClock,
  Cloud,
  Compass,
  Shield,
  ShieldAlert,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AiActivityLogTimelineItem } from '@/api/ai-activity-log.types';
import {
  AI_ACTIVITY_LOG_TABS,
  aiActivityLogCategoryIconKey,
  aiActivityLogStatusTone,
  formatAiActivityLogTime,
  resolveAiActivityLogHref,
  type AiActivityLogTab,
} from '@/lib/ai-activity-log-display.util';
import {
  aiActivityLogSectionCard,
  aiActivityLogStatusBadgeClass,
  aiActivityLogTimelineItem,
  aiActivityLogTimelineItemSelected,
} from './ai-activity-log-ui';

const CATEGORY_ICONS: Record<string, typeof Cloud> = {
  monitoring: Cloud,
  time_route: CalendarClock,
  activity: Compass,
  budget: Ticket,
  safety: ShieldAlert,
  team: Users,
  validation: Shield,
  other: Sparkles,
};

interface AiActivityLogTimelineProps {
  items: AiActivityLogTimelineItem[];
  activeTab: AiActivityLogTab;
  onTabChange: (tab: AiActivityLogTab) => void;
  selectedActivityId?: string | null;
  onSelect: (activityId: string) => void;
  onNavigateHref?: (href: string) => void;
  className?: string;
}

export default function AiActivityLogTimeline({
  items,
  activeTab,
  onTabChange,
  selectedActivityId,
  onSelect,
  onNavigateHref,
  className,
}: AiActivityLogTimelineProps) {
  return (
    <section className={cn(aiActivityLogSectionCard, className)}>
      <div className="border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-2">
          {AI_ACTIVITY_LOG_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-border/80 bg-muted/25 text-foreground ring-1 ring-inset ring-foreground/10'
                    : 'border-border/50 bg-transparent text-muted-foreground hover:bg-muted/15 hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-muted-foreground sm:px-5">
          当前筛选下暂无活动记录
        </p>
      ) : (
        <ol className="divide-y divide-border/50 p-3 sm:p-4">
          {items.map((item) => {
            const iconKey = aiActivityLogCategoryIconKey(item.category);
            const Icon = CATEGORY_ICONS[iconKey] ?? Sparkles;
            const selected = selectedActivityId === item.activityId;
            const tone = aiActivityLogStatusTone(item.statusTag);

            return (
              <li key={item.activityId}>
                <div
                  role="button"
                  tabIndex={0}
                  className={cn(
                    aiActivityLogTimelineItem,
                    selected && aiActivityLogTimelineItemSelected,
                  )}
                  onClick={() => onSelect(item.activityId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(item.activityId);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/45 bg-muted/15">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                          {formatAiActivityLogTime(item.occurredAt)}
                        </span>
                        <span className={aiActivityLogStatusBadgeClass(tone)}>
                          {item.statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                      {item.reason ? (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          原因：{item.reason}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {renderActionButton(item, 'viewEvidence', '查看依据', onNavigateHref)}
                        {renderActionButton(item, 'viewDiff', '查看差异', onNavigateHref)}
                        {renderActionButton(item, 'viewPlan', '查看方案', onNavigateHref)}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function renderActionButton(
  item: AiActivityLogTimelineItem,
  key: 'viewEvidence' | 'viewDiff' | 'viewPlan',
  label: string,
  onNavigateHref?: (href: string) => void,
) {
  const action = item.actions?.[key];
  if (!action?.enabled) return null;
  const href = resolveAiActivityLogHref(action.href);
  return (
    <Button
      key={key}
      variant="outline"
      size="sm"
      className="h-7 px-2 text-[10px]"
      onClick={(event) => {
        event.stopPropagation();
        if (href && onNavigateHref) onNavigateHref(href);
      }}
    >
      {label}
    </Button>
  );
}
