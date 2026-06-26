import { ReadinessRepairLoopWorkspace } from '@/components/trip-loop/ReadinessRepairLoopWorkspace';

interface FeasibilityTabProps {
  tripId: string;
}

/** @deprecated 请使用 /dashboard/feasibility?tripId= 全页 */
export default function FeasibilityTab({ tripId }: FeasibilityTabProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <ReadinessRepairLoopWorkspace tripId={tripId} variant="page" />
    </div>
  );
}
