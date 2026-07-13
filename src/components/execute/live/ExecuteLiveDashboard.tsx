import { ExecuteCenterColumn } from './ExecuteCenterColumn';
import { ExecuteDecisionSidebar } from './ExecuteDecisionSidebar';
import { ExecuteLiveHeader } from './ExecuteLiveHeader';
import { ExecuteStatusSidebar, type ExecuteMemberStatusItem, type ExecuteResourceItem } from './ExecuteStatusSidebar';
import type { ExecuteTodayStatusSnapshot } from '@/lib/execute-today-status.util';
import type { ExecuteRouteMapPoint } from './ExecuteRouteMap';
import type { ExecuteTimelineRailSnapshot } from '@/lib/execute-center.util';
import type { ExecuteCenterDetailModel } from '@/lib/execute-center-detail.util';
import type { CurrentWeather } from '@/types/weather';
import type { FallbackPlan } from '@/api/execution';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';

export interface ExecuteAlertBannerData {
  title: string;
  description?: string;
  onAction?: () => void;
}

export interface ExecuteLiveDashboardProps {
  tripTitle: string;
  revisionLabel?: string;
  statusSubline: string;
  dayNumber: number;
  totalDays: number;
  executionScore?: number | null;
  notificationCount?: number;
  collaborators?: Array<{ userId: string; displayName: string }>;
  weather?: Pick<CurrentWeather, 'temperature' | 'condition' | 'windSpeed' | 'metadata'> | null;
  windGust?: number | null;
  alertBanner?: ExecuteAlertBannerData | null;
  currentDate?: string;
  statusSidebar: {
    todayStatus?: ExecuteTodayStatusSnapshot;
    members?: ExecuteMemberStatusItem[];
    membersOnlineCount?: number;
    transport?: import('@/lib/execute-status-sidebar.util').ExecuteTransportStatusSnapshot;
    resources?: ExecuteResourceItem[];
    onViewMembersDetail?: () => void;
    onMemberClick?: (member: import('./ExecuteStatusSidebar').ExecuteMemberStatusItem) => void;
    onViewTransportMap?: () => void;
    onManageBookings?: () => void;
    onGroupIntercom?: () => void;
    onTeamNegotiation?: () => void;
    quickActions?: import('./ExecuteQuickActionsCard').ExecuteQuickActionItem[];
  };
  mapPoints: ExecuteRouteMapPoint[];
  routeCoordinates?: [number, number][];
  planBRouteCoordinates?: [number, number][];
  timelineRail: ExecuteTimelineRailSnapshot;
  centerDetail: ExecuteCenterDetailModel;
  onViewAlertDetail?: () => void;
  currentLegEta?: string;
  windWarningLabel?: string;
  vehicleTimeLabel?: string;
  onNavigate?: () => void;
  onNotificationsClick?: () => void;
  onCollaboratorsClick?: () => void;
  onTripTitleClick?: () => void;
  decisionSidebar?: {
    tripId?: string | null;
    trip?: import('@/types/trip').TripDetail | null;
    advisory: TripExecutionAdvisoryDto | null;
    fallbackPlan?: FallbackPlan | null;
    loading?: boolean;
    onOpenDetail?: () => void;
    onApplyPlan?: (id: string) => void;
    onViewEvidence?: () => void;
    onSos?: () => void;
  };
}

export function ExecuteLiveDashboard({
  tripTitle,
  revisionLabel,
  statusSubline,
  dayNumber,
  totalDays,
  executionScore,
  notificationCount,
  collaborators,
  weather,
  windGust,
  alertBanner,
  currentDate,
  statusSidebar,
  mapPoints,
  routeCoordinates,
  planBRouteCoordinates,
  timelineRail,
  centerDetail,
  onViewAlertDetail,
  windWarningLabel,
  vehicleTimeLabel,
  onNavigate,
  onNotificationsClick,
  onCollaboratorsClick,
  onTripTitleClick,
  decisionSidebar,
}: ExecuteLiveDashboardProps) {
  return (
    <div className="h-full flex flex-col bg-muted/30">
      <ExecuteLiveHeader
        tripTitle={tripTitle}
        revisionLabel={revisionLabel}
        statusSubline={statusSubline}
        dayNumber={dayNumber}
        totalDays={totalDays}
        executionScore={executionScore}
        notificationCount={notificationCount}
        collaborators={collaborators}
        weather={weather}
        windGust={windGust}
        alertBanner={alertBanner}
        onNotificationsClick={onNotificationsClick}
        onCollaboratorsClick={onCollaboratorsClick}
        onTripTitleClick={onTripTitleClick}
      />

      <div className="flex-1 min-h-0 overflow-hidden max-xl:overflow-y-auto">
        <div className="h-full w-full mx-auto p-2 sm:p-3">
          <div className="grid h-full grid-cols-1 xl:grid-cols-12 gap-1.5 lg:gap-2 xl:items-stretch">
            <div className="xl:col-span-2 order-2 xl:order-1 flex min-h-0 min-w-0 flex-col overflow-hidden xl:max-h-full">
              <ExecuteStatusSidebar
                className="min-h-0 flex-1"
                todayStatus={statusSidebar.todayStatus}
                members={statusSidebar.members}
                membersOnlineCount={statusSidebar.membersOnlineCount}
                transport={statusSidebar.transport}
                resources={statusSidebar.resources}
                onViewMembersDetail={statusSidebar.onViewMembersDetail}
                onMemberClick={statusSidebar.onMemberClick}
                onViewTransportMap={statusSidebar.onViewTransportMap}
                onManageBookings={statusSidebar.onManageBookings}
                onGroupIntercom={statusSidebar.onGroupIntercom}
                onTeamNegotiation={statusSidebar.onTeamNegotiation}
                onNavigate={onNavigate}
                quickActions={statusSidebar.quickActions}
              />
            </div>

            <div className="xl:col-span-7 order-1 xl:order-2 min-h-0 flex flex-col">
              <ExecuteCenterColumn
                className="flex min-h-0 flex-1 flex-col"
                dayNumber={dayNumber}
                currentDate={currentDate}
                windWarningLabel={windWarningLabel}
                timelineRail={timelineRail}
                vehicleTimeLabel={vehicleTimeLabel}
                mapPoints={mapPoints}
                routeCoordinates={routeCoordinates}
                planBRouteCoordinates={planBRouteCoordinates}
                centerDetail={centerDetail}
                onViewAlertDetail={onViewAlertDetail}
              />
            </div>

            {decisionSidebar ? (
              <div className="xl:col-span-3 order-3 flex min-h-0 min-w-0 flex-col overflow-hidden xl:max-h-full">
                <ExecuteDecisionSidebar
                  className="min-h-0 flex-1"
                  tripId={decisionSidebar.tripId}
                  trip={decisionSidebar.trip}
                  advisory={decisionSidebar.advisory}
                  fallbackPlan={decisionSidebar.fallbackPlan}
                  loading={decisionSidebar.loading}
                  onOpenDetail={decisionSidebar.onOpenDetail}
                  onApplyPlan={decisionSidebar.onApplyPlan}
                  onViewEvidence={decisionSidebar.onViewEvidence}
                  onSos={decisionSidebar.onSos}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
