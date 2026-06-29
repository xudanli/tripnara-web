import {
  BarChart3,
  CalendarDays,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { JourneyLayerKind, JourneyMapModel, MemberGroupId } from '../types';
import { JOURNEY_LAYER_OPTIONS } from '../types';
import {
  journeyMapDataFeedLabel,
  journeyMapDataFeedRow,
  journeyMapDataFeedTimeFresh,
  journeyMapDataFeedTimeStale,
  journeyMapDayQuickPick,
  journeyMapDayQuickPickSelected,
  journeyMapFilterChipActive,
  journeyMapFilterChipIdle,
  journeyMapFocusRing,
  journeyMapMemberCardIdle,
  journeyMapMemberCardSelected,
  journeyMapPanelCollapsedRail,
  journeyMapPanelShellLeft,
  journeyMapScheduleDayMarker,
  journeyMapScheduleDayPillSelected,
  journeyMapScheduleList,
  journeyMapScheduleRail,
  journeyMapScheduleRow,
  journeyMapScheduleRowSelected,
  journeyMapSectionDivider,
  journeyMapSectionHeading,
  journeyMapSectionHeadingIcon,
  journeyMapSectionHeadingTitle,
  journeyMapSidebarFooter,
  journeyMapSidebarHeader,
  journeyMapSidebarSubtitle,
  journeyMapSidebarTitle,
  journeyMapStatCell,
  journeyMapStatLabel,
  journeyMapStatValue,
} from '../journey-map-ui';

export interface FullJourneyMapLeftPanelProps {
  model: JourneyMapModel;
  selectedDayIndex: number;
  onSelectDay: (dayIndex: number) => void;
  activeLayers: Set<JourneyLayerKind | 'all'>;
  onToggleLayer: (layer: JourneyLayerKind | 'all') => void;
  memberFilter: MemberGroupId;
  onMemberFilterChange: (filter: MemberGroupId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  lastRefreshedAt?: string | null;
  enriching?: boolean;
  onReload?: () => void;
  embedded?: boolean;
  className?: string;
}

function formatDataRefreshLabel(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return formatDistanceToNow(new Date(iso), { locale: zhCN, addSuffix: true });
  } catch {
    return null;
  }
}

export function FullJourneyMapLeftPanel({
  model,
  selectedDayIndex,
  onSelectDay,
  activeLayers,
  onToggleLayer,
  memberFilter,
  onMemberFilterChange,
  collapsed,
  onToggleCollapse,
  lastRefreshedAt,
  enriching = false,
  onReload,
  embedded = false,
  className,
}: FullJourneyMapLeftPanelProps) {
  if (!embedded && collapsed) {
    return (
      <div className={cn(journeyMapPanelCollapsedRail, 'border-r', className)}>
        <Button
          variant="ghost"
          size="icon"
          className={cn('mx-auto mt-2 h-9 w-9', journeyMapFocusRing)}
          onClick={onToggleCollapse}
          aria-label="展开行程侧栏"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <div
          className="mt-3 flex flex-col items-center gap-1 px-1"
          role="tablist"
          aria-label="行程天数"
        >
          {model.days.map((day) => {
            const selected = day.dayIndex === selectedDayIndex;
            return (
              <button
                key={day.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`${day.label}，${day.routeLabel}`}
                title={day.routeLabel}
                onClick={() => onSelectDay(day.dayIndex)}
                className={cn(selected ? journeyMapDayQuickPickSelected : journeyMapDayQuickPick)}
              >
                <span
                  className="mb-0.5 block h-1 w-4 rounded-full"
                  style={{ backgroundColor: day.color }}
                  aria-hidden
                />
                {day.dayIndex + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const memberCards: Array<{
    id: MemberGroupId;
    label: string;
    count: number;
    members: JourneyMapModel['members'];
  }> = [
    ...model.memberGroups.map((group) => ({
      id: group.id,
      label: group.label,
      count: group.count,
      members: model.members.filter((m) => m.groupId === group.id),
    })),
    {
      id: 'all',
      label: '全体成员',
      count: model.members.length,
      members: model.members,
    },
  ];

  return (
    <aside
      className={cn(
        embedded ? 'h-full w-full bg-card' : journeyMapPanelShellLeft,
        className,
      )}
    >
      <div className={journeyMapSidebarHeader}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className={journeyMapSidebarTitle}>{model.tripTitle}</h2>
            {model.dateRangeLabel ? (
              <p className={journeyMapSidebarSubtitle}>{model.dateRangeLabel}</p>
            ) : null}
          </div>
          {!embedded ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              onClick={onToggleCollapse}
              aria-label="收起侧栏"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0 px-3 py-3">
          <section className={journeyMapSectionDivider} aria-labelledby="journey-schedule-heading">
            <SectionHeading id="journey-schedule-heading" icon={CalendarDays} title="行程日程" />
            <JourneyScheduleList
              days={model.days}
              selectedDayIndex={selectedDayIndex}
              onSelectDay={onSelectDay}
            />
          </section>

          <section className={journeyMapSectionDivider} aria-labelledby="journey-layer-heading">
            <SectionHeading id="journey-layer-heading" icon={SlidersHorizontal} title="图层与筛选" />
            <div
              className="mt-2 flex flex-wrap gap-1"
              role="group"
              aria-labelledby="journey-layer-heading"
            >
              {JOURNEY_LAYER_OPTIONS.map((opt) => {
                const active =
                  opt.id === 'all' ? activeLayers.has('all') : activeLayers.has(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggleLayer(opt.id)}
                    className={cn(
                      'rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition-colors',
                      journeyMapFocusRing,
                      active ? journeyMapFilterChipActive : journeyMapFilterChipIdle,
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[10px] text-muted-foreground">按成员查看 · 在下方选择分组</p>
          </section>

          <section className={journeyMapSectionDivider} aria-labelledby="journey-member-heading">
            <SectionHeading id="journey-member-heading" icon={Users} title="成员筛选" />
            <div
              className="mt-2 grid grid-cols-2 gap-1.5"
              role="radiogroup"
              aria-labelledby="journey-member-heading"
            >
              {memberCards.map((card) => {
                const selected = memberFilter === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onMemberFilterChange(card.id)}
                    className={cn(
                      'rounded-xl border px-2 py-2 text-left transition-colors',
                      journeyMapFocusRing,
                      selected ? journeyMapMemberCardSelected : journeyMapMemberCardIdle,
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-medium text-foreground">
                        {card.label}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {card.count}人
                      </span>
                    </div>
                    <MemberGroupAvatars members={card.members} max={card.id === 'all' ? 4 : 3} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className={journeyMapSectionDivider} aria-labelledby="journey-stats-heading">
            <SectionHeading id="journey-stats-heading" icon={BarChart3} title="行程统计" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatCell label="总天数" value={String(model.stats.totalDays)} />
              <StatCell
                label="总路线公里数"
                value={`${model.stats.totalDistanceKm.toLocaleString()} km`}
              />
              <StatCell label="活动数量" value={String(model.stats.activityCount)} />
              <StatCell label="分流次数" value={String(model.stats.diversionCount)} />
            </div>
          </section>

          <section className={journeyMapSectionDivider} aria-labelledby="journey-feeds-heading">
            <SectionHeading id="journey-feeds-heading" icon={Clock} title="约束与数据更新" />
            <ul className="mt-3 space-y-2">
              {model.dataFeeds.map((feed) => (
                <li key={feed.id} className={journeyMapDataFeedRow}>
                  <span className={journeyMapDataFeedLabel}>{feed.label}</span>
                  <span
                    className={
                      feed.status === 'fresh'
                        ? journeyMapDataFeedTimeFresh
                        : journeyMapDataFeedTimeStale
                    }
                  >
                    {feed.updatedAt}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </ScrollArea>

      <SidebarFooter
        enriching={enriching}
        lastRefreshedAt={lastRefreshedAt}
        onReload={onReload}
      />
    </aside>
  );
}

function JourneyScheduleList({
  days,
  selectedDayIndex,
  onSelectDay,
}: {
  days: JourneyMapModel['days'];
  selectedDayIndex: number;
  onSelectDay: (dayIndex: number) => void;
}) {
  if (days.length === 0) return null;

  return (
    <div className={cn('mt-2', journeyMapScheduleList)} role="tablist" aria-label="行程天数">
      {/* 时间轴竖线 */}
      <span
        className="pointer-events-none absolute bottom-2 left-[0.375rem] top-2 w-px bg-border/80"
        aria-hidden
      />

      <div className="flex flex-col gap-px">
        {days.map((day) => {
          const selected = day.dayIndex === selectedDayIndex;
          const dayNumberLabel = `Day ${day.dayIndex + 1}`;

          return (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${dayNumberLabel}，${day.routeLabel}，${day.distanceKm} 公里`}
              title={day.routeLabel}
              onClick={() => onSelectDay(day.dayIndex)}
              className={cn(
                selected
                  ? cn(journeyMapScheduleRowSelected, 'my-0.5 overflow-hidden first:mt-0 last:mb-0')
                  : cn(journeyMapScheduleRow, 'hover:bg-muted/20'),
              )}
            >
              <div className={cn(journeyMapScheduleRail, !selected && 'flex-col items-stretch justify-start px-0')}>
                {selected ? (
                  <div className={journeyMapScheduleDayPillSelected}>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full border-2 border-background bg-transparent"
                      aria-hidden
                    />
                    <span className="text-[10px] font-semibold leading-none text-background">
                      {dayNumberLabel}
                    </span>
                  </div>
                ) : (
                  <div className={journeyMapScheduleDayMarker}>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: day.color }}
                      aria-hidden
                    />
                    <span className="text-[10px] font-medium leading-none text-muted-foreground">
                      {dayNumberLabel}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2 py-1.5 pr-1.5">
                <p className="text-[12px] font-medium leading-snug text-foreground line-clamp-2">
                  {day.routeLabel}
                </p>
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    selected ? 'font-medium text-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  {day.distanceKm.toLocaleString()} km
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SidebarFooter({
  enriching,
  lastRefreshedAt,
  onReload,
}: {
  enriching: boolean;
  lastRefreshedAt?: string | null;
  onReload?: () => void;
}) {
  const refreshLabel = formatDataRefreshLabel(lastRefreshedAt);

  return (
    <div className={journeyMapSidebarFooter}>
      <p className="min-w-0 truncate text-[11px] text-muted-foreground">
        {enriching
          ? '正在更新数据…'
          : refreshLabel
            ? `全部数据 ${refreshLabel}已更新`
            : '数据更新时间未知'}
      </p>
      {onReload ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 shrink-0', journeyMapFocusRing)}
          onClick={onReload}
          aria-label="刷新数据"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', enriching && 'animate-spin')} />
        </Button>
      ) : null}
    </div>
  );
}

function SectionHeading({
  id,
  icon: Icon,
  title,
}: {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className={journeyMapSectionHeading} id={id}>
      <Icon className={journeyMapSectionHeadingIcon} aria-hidden />
      <h3 className={journeyMapSectionHeadingTitle}>{title}</h3>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={journeyMapStatCell}>
      <p className={journeyMapStatLabel}>{label}</p>
      <p className={journeyMapStatValue}>{value}</p>
    </div>
  );
}

function MemberGroupAvatars({
  members,
  max,
}: {
  members: JourneyMapModel['members'];
  max: number;
}) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;

  if (members.length === 0) {
    return <div className="mt-2 h-6" aria-hidden />;
  }

  return (
    <div className="mt-2 flex -space-x-1.5">
      {shown.map((m) => (
        <Avatar key={m.id} className="h-6 w-6 border-2 border-background">
          <AvatarFallback
            className="text-[9px] font-medium text-white"
            style={{ backgroundColor: m.avatarColor ?? '#94a3b8' }}
          >
            {m.initials}
          </AvatarFallback>
        </Avatar>
      ))}
      {rest > 0 ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
