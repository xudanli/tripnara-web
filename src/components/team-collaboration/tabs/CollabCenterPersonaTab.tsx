import { CollabCenterPersonaDashboard } from '@/components/team-collaboration/CollabCenterPersonaDashboard';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import type { DecisionProfilingSurface } from '@/lib/decision-profiling-navigation';

interface CollabCenterPersonaTabProps {
  tripId: string;
  initialStep?: DecisionProfilingStep | null;
  forceOpenQuiz?: boolean;
  forceReuseProfile?: boolean;
  initialSurface?: DecisionProfilingSurface | null;
}

export function CollabCenterPersonaTab({
  tripId,
  initialStep,
  forceOpenQuiz,
}: CollabCenterPersonaTabProps) {
  return (
    <CollabCenterPersonaDashboard
      tripId={tripId}
      initialStep={initialStep}
      forceOpenQuiz={forceOpenQuiz}
    />
  );
}
