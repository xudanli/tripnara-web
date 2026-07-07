import { useNavigate } from 'react-router-dom';
import TravelStatusOverviewPanel from '@/components/travel-status/TravelStatusOverviewPanel';
import type { TripStatusBarSection } from '@/components/trip-world-state';
import type { TripOverviewSection } from '@/components/trips/detail/TripDetailTabNav';
import type { TripDetail } from '@/types/trip';

interface TripDetailTravelOverviewTabProps {
  tripId: string;
  trip: TripDetail;
  onOpenTimeline: () => void;
  onOpenDecisions?: () => void;
  onOpenMonitoring?: () => void;
  scrollToSection?: TripOverviewSection | TripStatusBarSection | null;
  onScrollToSectionHandled?: () => void;
}

/**
 * 概览 Tab · 产品信息架构
 * 1. 结论（顶部 TripWorldStateBar）→ 2. 指标条 → 3. 行程条件（全宽）
 * 4. 双栏：待办/监控（左）· 可执行行程（右）；无待办时监控占主栏
 */
export default function TripDetailTravelOverviewTab({
  tripId,
  trip,
  onOpenTimeline,
  scrollToSection,
  onScrollToSectionHandled,
}: TripDetailTravelOverviewTabProps) {
  const navigate = useNavigate();

  return (
    <TravelStatusOverviewPanel
      tripId={tripId}
      trip={trip}
      onOpenTimeline={onOpenTimeline}
      onViewFeasibility={() =>
        navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=feasibility`)
      }
      skipTopSummary
      compact
      overviewLayout
      scrollToSection={scrollToSection}
      onScrollToSectionHandled={onScrollToSectionHandled}
    />
  );
}
