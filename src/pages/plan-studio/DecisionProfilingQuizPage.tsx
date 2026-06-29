import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { buildCollabCenterPlanStudioUrl } from '@/lib/collab-center-navigation';
import { DecisionProfilingQuizDialog } from '@/components/decision-profiling';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';

/** 深链入口：/dashboard/trips/:tripId/decision-profiling/quiz?step=travel_style */
export default function DecisionProfilingQuizPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const step = (searchParams.get('step') ?? 'travel_style') as DecisionProfilingStep;

  const backToPlanStudio = () => {
    if (!tripId) {
      navigate(-1);
      return;
    }
    navigate(buildCollabCenterPlanStudioUrl(tripId, { collabTab: 'persona' }));
  };

  if (!tripId) return null;

  return (
    <DecisionProfilingQuizDialog
      tripId={tripId}
      open
      initialStep={step === 'overview' ? 'travel_style' : step}
      onOpenChange={(open) => {
        if (!open) backToPlanStudio();
      }}
      onCompleted={backToPlanStudio}
    />
  );
}
