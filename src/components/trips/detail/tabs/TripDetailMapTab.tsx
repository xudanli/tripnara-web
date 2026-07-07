import { ExternalLink, Layers, Map as MapIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FullJourneyMapCanvas } from '@/features/full-journey-map/components/FullJourneyMapCanvas';
import { useJourneyMapData } from '@/features/full-journey-map/hooks/useJourneyMapData';
import type { JourneyActivity } from '@/features/full-journey-map/types';
import { useMemo, useState } from 'react';
import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import { cn } from '@/lib/utils';
import { TRIP_DETAIL_NAV } from '@/lib/trip-detail-terminology.util';
import { TripDetailSection, TripDetailTwoColumn, tripDetailUi } from '../trip-detail-ui';

const sectionCompact = {
  className: 'shadow-none' as const,
  headerClassName: 'px-3 py-2',
  bodyClassName: 'p-3',
};

interface TripDetailMapTabProps {
  tripId: string;
  onOpenFullMap?: () => void;
  onOpenMonitoring?: () => void;
}

function MapTabSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-220px)] flex-1 flex-col gap-3 xl:flex-row">
      <Skeleton className="min-h-[calc(100vh-220px)] flex-1 rounded-xl" />
      <Skeleton className="h-full min-h-[240px] w-full rounded-xl xl:w-[280px]" />
    </div>
  );
}

export default function TripDetailMapTab({ tripId, onOpenFullMap, onOpenMonitoring }: TripDetailMapTabProps) {
  const { model, loading, error } = useJourneyMapData(tripId);
  const { status } = useTripStatusBarModel(tripId);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<JourneyActivity | null>(null);
  const activeLayers = useMemo(() => new Set(['all'] as const), []);
  const riskItems = status?.monitoring?.items ?? [];
  const alertItems = useMemo(
    () => riskItems.filter((item) => item.status === 'ALERT' || item.status === 'ACTIVE'),
    [riskItems],
  );

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MapTabSkeleton />
      </div>
    );
  }

  if (error || !model) {
    return (
      <TripDetailSection title="地图" {...sectionCompact}>
        <div className="py-8 text-center text-muted-foreground">
          <MapIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">暂时无法加载地图</p>
          {onOpenFullMap ? (
            <Button variant="outline" size="sm" className="mt-3 h-8 text-xs" onClick={onOpenFullMap}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              打开完整地图
            </Button>
          ) : null}
        </div>
      </TripDetailSection>
    );
  }

  const dayCount = model.days.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TripDetailTwoColumn
        className="min-h-[calc(100vh-220px)] flex-1 gap-3 xl:flex-row"
        mainClassName="flex min-h-0 flex-1 flex-col"
        sidebarClassName="space-y-2.5 xl:max-h-full xl:shrink-0 xl:overflow-y-auto"
        main={
          <div className={cn(tripDetailUi.card, 'flex min-h-0 flex-1 flex-col overflow-hidden shadow-none')}>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                variant={selectedDayIndex === -1 ? 'default' : 'outline'}
                onClick={() => setSelectedDayIndex(-1)}
              >
                全程
              </Button>
              {model.days.map((_, i) => (
                <Button
                  key={i}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  variant={selectedDayIndex === i ? 'default' : 'outline'}
                  onClick={() => setSelectedDayIndex(i)}
                >
                  Day {i + 1}
                </Button>
              ))}
            </div>
            {onOpenFullMap ? (
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onOpenFullMap}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                全屏地图
              </Button>
            ) : null}
          </div>
          <div className="relative min-h-0 flex-1">
            <FullJourneyMapCanvas
              model={model}
              selectedDayIndex={selectedDayIndex === -1 ? 0 : selectedDayIndex}
              selectedActivityId={selectedActivity?.id ?? null}
              activeLayers={activeLayers}
              memberFilter="all"
              onSelectActivity={setSelectedActivity}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      }
      sidebar={
        <>
          <TripDetailSection title="活动详情" {...sectionCompact}>
            {selectedActivity ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold leading-tight text-foreground">{selectedActivity.title}</h4>
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {selectedActivity.summary || selectedActivity.location}
                </p>
                {selectedActivity.intensity ? (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    强度 {selectedActivity.intensity}
                  </Badge>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">点击地图上的标记查看详情</p>
            )}
          </TripDetailSection>
          <TripDetailSection title="图例" {...sectionCompact}>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              {model.days.slice(0, dayCount).map((day, i) => (
                <div key={day.id} className="flex items-center gap-1.5">
                  <Layers className="h-3 w-3 shrink-0" />
                  <span className="text-foreground">Day {i + 1}</span>
                  <span className="truncate">{day.label}</span>
                </div>
              ))}
            </div>
          </TripDetailSection>
          <TripDetailSection
            title="风险图层"
            {...sectionCompact}
            action={
              onOpenMonitoring ? (
                <button
                  type="button"
                  className="text-[10px] text-primary underline-offset-4 hover:underline"
                  onClick={onOpenMonitoring}
                >
                  {TRIP_DETAIL_NAV.openOverviewMonitoring}
                </button>
              ) : undefined
            }
          >
            {alertItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无活跃风险告警</p>
            ) : (
              <ul className="space-y-1.5">
                {alertItems.map((item) => (
                  <li
                    key={`${item.kind}-${item.label}`}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-[11px]',
                      item.status === 'ALERT'
                        ? 'border-gate-reject-border/40 bg-gate-reject/5 text-gate-reject-foreground'
                        : 'border-gate-confirm-border/40 bg-gate-confirm/5 text-foreground',
                    )}
                  >
                    <p className="font-medium leading-snug">{item.label}</p>
                    {item.summary ? (
                      <p className="mt-0.5 line-clamp-2 text-muted-foreground">{item.summary}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </TripDetailSection>
        </>
      }
      />
    </div>
  );
}
