import { FeasibilityReportPanel } from '@/components/feasibility-report';

interface FeasibilityTabProps {
  tripId: string;
}

/** @deprecated 请使用 /dashboard/feasibility?tripId= 全页 */
export default function FeasibilityTab({ tripId }: FeasibilityTabProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <FeasibilityReportPanel tripId={tripId} />
    </div>
  );
}
