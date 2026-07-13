import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarRange, ClipboardList, SlidersHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TripDetail } from '@/types/trip';
import type { ArrangePlanningMode } from '@/types/arrange-itinerary';
import {
  workbenchAttractionExploreViewTabIdle,
  workbenchAttractionExploreViewTabSelected,
} from '../workbench-ui';
import { ARRANGE_ITINERARY_VIEW_TABS, type ArrangeItineraryViewMode } from './types';

export interface ArrangeItineraryToolbarProps {
  trip: TripDetail | null;
  viewMode: ArrangeItineraryViewMode;
  onViewModeChange: (mode: ArrangeItineraryViewMode) => void;
  mapSyncEnabled: boolean;
  onMapSyncChange: (enabled: boolean) => void;
  autoArrangePending?: boolean;
  onAutoArrange?: () => void;
  planningMode?: ArrangePlanningMode;
  planningModePending?: boolean;
  onPlanningModeChange?: (mode: ArrangePlanningMode) => void;
  onOpenItineraryDiagnosis?: () => void;
  onOpenConstraints?: () => void;
  conflictMustHandleCount?: number;
  className?: string;
}

function formatTripDateRange(trip: TripDetail | null): string {
  if (!trip?.startDate || !trip?.endDate) return '日期待定';
  try {
    const start = format(new Date(trip.startDate), 'M月d日', { locale: zhCN });
    const end = format(new Date(trip.endDate), 'M月d日', { locale: zhCN });
    return `${start} – ${end}`;
  } catch {
    return `${trip.startDate} – ${trip.endDate}`;
  }
}

export function ArrangeItineraryToolbar({
  trip,
  viewMode,
  onViewModeChange,
  mapSyncEnabled,
  onMapSyncChange,
  autoArrangePending,
  onAutoArrange,
  planningMode = 'copilot',
  planningModePending = false,
  onPlanningModeChange,
  onOpenItineraryDiagnosis,
  onOpenConstraints,
  conflictMustHandleCount = 0,
  className,
}: ArrangeItineraryToolbarProps) {
  const copilotEnabled = planningMode === 'copilot';
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5 sm:px-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate text-xs font-medium text-foreground">
          {formatTripDateRange(trip)}
        </span>
        {trip?.destination ? (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            · {trip.destination}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onOpenItineraryDiagnosis ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 rounded-md px-2 text-[10px]"
            onClick={onOpenItineraryDiagnosis}
          >
            <ClipboardList className="h-3 w-3" />
            行程诊断
            {conflictMustHandleCount > 0 ? (
              <span className="rounded-full bg-destructive/10 px-1.5 text-[9px] font-medium text-destructive">
                {conflictMustHandleCount}
              </span>
            ) : null}
          </Button>
        ) : null}
        {onOpenConstraints ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 rounded-md px-2 text-[10px]"
            onClick={onOpenConstraints}
          >
            <SlidersHorizontal className="h-3 w-3" />
            约束编辑
          </Button>
        ) : null}

        {onPlanningModeChange ? (
          <div className="inline-flex rounded-lg border border-border/60 bg-background p-0.5">
            {(
              [
                { id: 'manual' as const, label: '手动' },
                { id: 'copilot' as const, label: '智能编排' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={planningModePending}
                onClick={() => onPlanningModeChange(tab.id)}
                className={cn(
                  'whitespace-nowrap rounded-md px-2 py-1 text-[11px] transition-colors',
                  planningMode === tab.id
                    ? workbenchAttractionExploreViewTabSelected
                    : workbenchAttractionExploreViewTabIdle,
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-border/60 bg-background p-0.5">
          {ARRANGE_ITINERARY_VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'auto') {
                  onAutoArrange?.();
                  return;
                }
                onViewModeChange(tab.id);
              }}
              disabled={(tab.id === 'auto' && autoArrangePending) || (tab.id === 'auto' && !copilotEnabled)}
              className={cn(
                'whitespace-nowrap rounded-md px-2 py-1 text-[11px] transition-colors',
                tab.id !== 'auto' && viewMode === tab.id
                  ? workbenchAttractionExploreViewTabSelected
                  : workbenchAttractionExploreViewTabIdle,
                tab.id === 'auto' && !copilotEnabled && 'opacity-50',
              )}
            >
              {tab.id === 'auto' && autoArrangePending ? '编排中…' : tab.label}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Switch
            checked={mapSyncEnabled}
            onCheckedChange={onMapSyncChange}
            aria-label="地图联动"
          />
          地图联动
        </label>
      </div>
    </div>
  );
}
