import { Link, useParams } from 'react-router-dom';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import { useDecisionReplay } from '@/features/active-trip/hooks/useActiveTripDashboard';
import { DecisionReplayPanel } from '@/features/active-trip/components/DecisionReplayPanel';

/** GET /trips/:id/decision-replay */
export default function ActiveTripReplayPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: replay, isLoading, isError, refetch } = useDecisionReplay(tripId);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LogoLoading size={40} />
      </div>
    );
  }

  if (isError || !replay) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">Decision Replay 加载失败</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-3xl px-4 py-6 sm:px-6">
      <DashboardSubpageHeader
        backTo={tripId ? `/dashboard/trips/${tripId}/active` : '/dashboard/trips'}
        title="Decision Replay"
        subtitle="Abu 叙事 · 决策链回放"
        maxWidth="3xl"
      />
      <div className="mt-4">
        <DecisionReplayPanel replay={replay} />
        {tripId && (
          <Button className="mt-4" variant="outline" size="sm" asChild>
            <Link to={`/dashboard/trips/${tripId}/active`}>返回 Active Trip</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
