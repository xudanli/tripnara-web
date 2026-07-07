import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import { TripOverviewHero } from './TripOverviewHero';

interface TripOverviewHeroContainerProps {
  tripId: string;
  onHandleIssues?: () => void;
  onViewFeasibility?: () => void;
  className?: string;
  showIssueDetail?: boolean;
}

export function TripOverviewHeroContainer({
  tripId,
  onHandleIssues,
  onViewFeasibility,
  className,
  showIssueDetail,
}: TripOverviewHeroContainerProps) {
  const { model, isLoading, isUnavailable } = useTripStatusBarModel(tripId);

  if (isLoading || isUnavailable || !model) {
    return null;
  }

  return (
    <TripOverviewHero
      model={model}
      onHandleIssues={onHandleIssues}
      onViewFeasibility={onViewFeasibility}
      className={className}
      showIssueDetail={showIssueDetail}
    />
  );
}
