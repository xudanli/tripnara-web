import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TRIP_DETAIL_NAV } from '@/lib/trip-detail-terminology.util';

export const TRIP_DETAIL_PRIMARY_TABS = [
  { value: 'timeline', label: '规划' },
  { value: 'budget', label: '预算' },
  { value: 'members', label: '成员' },
  { value: 'files', label: '文件' },
] as const;

/** 不在主导航展示，但保留路由的 Tab（URL / 页内深链） */
export const TRIP_DETAIL_HIDDEN_TABS = [
  { value: 'bookings', label: '预订与保障' },
  { value: 'decision-log', label: TRIP_DETAIL_NAV.decisionHistory },
] as const;

export const TRIP_DETAIL_TABS = [
  ...TRIP_DETAIL_PRIMARY_TABS,
  ...TRIP_DETAIL_HIDDEN_TABS,
] as const;

export type TripDetailTabValue = (typeof TRIP_DETAIL_TABS)[number]['value'];

const TRIP_DETAIL_TAB_SCROLL_CLASS: Partial<Record<TripDetailTabValue, string>> = {
  timeline: 'bg-background p-2 sm:p-3',
  budget: 'bg-background p-2 sm:p-3',
  members: 'bg-background p-2 sm:p-3',
  files: 'bg-background p-2 sm:p-3',
};

export function tripDetailLegacyTabRedirect(
  tabParam: string | null,
): { tab: TripDetailTabValue } | null {
  if (tabParam === 'decisions' || tabParam === 'decision-center') {
    return { tab: 'decision-log' };
  }
  if (tabParam === 'monitoring' || tabParam === 'monitor') {
    return { tab: 'timeline' };
  }
  if (tabParam === 'map' || tabParam === 'overview' || tabParam === 'travel') {
    return { tab: 'timeline' };
  }
  if (tabParam === 'today') {
    return { tab: 'timeline' };
  }
  if (tabParam === 'accommodation') {
    return { tab: 'timeline' };
  }
  if (tabParam === 'activities') {
    return { tab: 'timeline' };
  }
  return null;
}

export function tripDetailTabScrollAreaClass(activeTab: string): string {
  return cn(
    'flex-1 min-h-0 overflow-y-auto',
    TRIP_DETAIL_TAB_SCROLL_CLASS[activeTab as TripDetailTabValue] ?? 'bg-muted/30 p-3 sm:p-4',
  );
}

interface TripDetailTabNavProps {
  className?: string;
  activeTab?: string;
  extraTabs?: Array<{ value: string; label: string }>;
}

const tabTriggerClass = cn(
  'cursor-pointer rounded-none border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground',
  'data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-medium',
);

export default function TripDetailTabNav({
  className,
  activeTab,
  extraTabs,
}: TripDetailTabNavProps) {
  const activeHiddenTab = TRIP_DETAIL_HIDDEN_TABS.find((tab) => tab.value === activeTab);

  return (
    <div
      className={cn(
        'border-b border-border bg-card px-4 sm:px-6 shadow-sm flex-shrink-0 overflow-x-auto',
        className,
      )}
    >
      <TabsList className="h-9 bg-transparent p-0 gap-0 w-max min-w-full justify-start rounded-none">
        {TRIP_DETAIL_PRIMARY_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className={tabTriggerClass}>
            {tab.label}
          </TabsTrigger>
        ))}

        {extraTabs?.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className={tabTriggerClass}>
            {tab.label}
          </TabsTrigger>
        ))}

        {activeHiddenTab ? (
          <TabsTrigger value={activeHiddenTab.value} className={tabTriggerClass}>
            {activeHiddenTab.label}
          </TabsTrigger>
        ) : null}
      </TabsList>
    </div>
  );
}
