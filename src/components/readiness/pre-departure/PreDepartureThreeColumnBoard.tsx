import type { TripDetail } from '@/types/trip';
import type {
  ReadinessPreparationTask,
  ReadinessTaskMember,
} from '@/lib/readiness-preparation-tasks';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import PreDepartureTasksColumn from './PreDepartureTasksColumn';
import PreDeparturePackingColumn from './PreDeparturePackingColumn';
import PreDepartureBookingsColumn from './PreDepartureBookingsColumn';
import { cn } from '@/lib/utils';

export type PreDepartureDetailPanel = 'tasks' | 'packing' | 'bookings';

interface PreDepartureThreeColumnBoardProps {
  tripId: string;
  trip: TripDetail | null;
  tasks: ReadinessPreparationTask[];
  members: ReadinessTaskMember[];
  planningConflicts?: PlanningConflictItem[];
  packingRefreshKey?: number;
  onOpenDetail?: (panel: PreDepartureDetailPanel) => void;
  onGoToSchedule?: (itemId?: string) => void;
  className?: string;
}

export default function PreDepartureThreeColumnBoard({
  tripId,
  trip,
  tasks,
  members,
  planningConflicts = [],
  packingRefreshKey = 0,
  onOpenDetail,
  onGoToSchedule,
  className,
}: PreDepartureThreeColumnBoardProps) {
  return (
    <div
      className={cn(
        'grid gap-3 xl:grid-cols-3 lg:grid-cols-2 grid-cols-1',
        className,
      )}
    >
      <PreDepartureTasksColumn
        tasks={tasks}
        members={members}
        tripStartDate={trip?.startDate}
        planningConflicts={planningConflicts}
        onViewAll={onOpenDetail ? () => onOpenDetail('tasks') : undefined}
      />
      <PreDeparturePackingColumn
        tripId={tripId}
        refreshKey={packingRefreshKey}
        onViewAll={onOpenDetail ? () => onOpenDetail('packing') : undefined}
      />
      <PreDepartureBookingsColumn
        trip={trip}
        onViewAll={onOpenDetail ? () => onOpenDetail('bookings') : undefined}
        onGoToSchedule={onGoToSchedule}
      />
    </div>
  );
}
