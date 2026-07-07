import { ExecuteCenterAlertDock } from './ExecuteCenterAlertDock';
import { ExecuteCenterDetailSection } from './ExecuteCenterDetailSection';
import { ExecuteTodayItineraryPanel } from './ExecuteTodayItineraryPanel';
import type { ExecuteCenterDetailModel } from '@/lib/execute-center-detail.util';
import type { ExecuteTimelineRailSnapshot } from '@/lib/execute-center.util';
import type { ExecuteRouteMapPoint } from './ExecuteRouteMap';
import { cn } from '@/lib/utils';

interface ExecuteCenterColumnProps {
  dayNumber: number;
  currentDate?: string;
  windWarningLabel?: string;
  timelineRail: ExecuteTimelineRailSnapshot;
  vehicleTimeLabel?: string;
  mapPoints: ExecuteRouteMapPoint[];
  routeCoordinates?: [number, number][];
  planBRouteCoordinates?: [number, number][];
  centerDetail: ExecuteCenterDetailModel;
  onViewAlertDetail?: () => void;
  className?: string;
}

export function ExecuteCenterColumn({
  dayNumber,
  currentDate,
  windWarningLabel,
  timelineRail,
  vehicleTimeLabel,
  mapPoints,
  routeCoordinates,
  planBRouteCoordinates,
  centerDetail,
  onViewAlertDetail,
  className,
}: ExecuteCenterColumnProps) {
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <ExecuteTodayItineraryPanel
        className="flex min-h-[220px] flex-[2] flex-col overflow-hidden"
        dayNumber={dayNumber}
        currentDate={currentDate}
        windWarningLabel={windWarningLabel}
        timelineRail={timelineRail}
        vehicleTimeLabel={vehicleTimeLabel}
        mapPoints={mapPoints}
        routeCoordinates={routeCoordinates}
        planBRouteCoordinates={planBRouteCoordinates}
      />

      <div className="mt-1.5 flex min-h-0 flex-[3] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <ExecuteCenterDetailSection
          className="min-h-0 flex-1 overflow-y-auto border-0 shadow-none rounded-none"
          model={centerDetail}
        />
        <ExecuteCenterAlertDock
          alert={centerDetail.realtimeAlert}
          onViewDetail={onViewAlertDetail}
        />
      </div>
    </div>
  );
}
