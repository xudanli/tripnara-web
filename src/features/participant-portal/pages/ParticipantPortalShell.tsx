import { Outlet, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { useParticipantTrustSurface } from '@/hooks/useParticipantPortal';
import { filterParticipantTrustCards } from '@/lib/gate1-trust-display';
import { ParticipantMobileLayout } from '../layout/ParticipantMobileLayout';
import { ParticipantTabNav } from '../components/ParticipantTabNav';
import {
  ParticipantProjectProvider,
  useParticipantProject,
} from '../shell/ParticipantProjectProvider';

function ParticipantPortalFrame() {
  const { token = '' } = useParams<{ token: string }>();
  const { invite, dashboard, phase, isLoading, isError, errorGuide, projectSubtitle } =
    useParticipantProject();
  const { data: trustSurface } = useParticipantTrustSurface(
    phase === 'active' ? token : undefined,
  );

  const trustSurfaceCardCount =
    dashboard?.trustSurface?.cardCount ??
    filterParticipantTrustCards(trustSurface?.cards ?? []).length ??
    0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-sm">
            <p className="font-medium">{errorGuide?.title ?? '无法加载项目'}</p>
            <p className="mt-2 text-muted-foreground">
              {errorGuide?.description ?? '链接可能已失效，请重新打开邀请链接。'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ParticipantMobileLayout
      projectTitle={invite.project.title}
      subtitle={projectSubtitle}
    >
      <ParticipantTabNav
        proposalCandidateId={dashboard?.proposalSummary?.candidateId}
        trustSurfaceCardCount={trustSurfaceCardCount}
        showFullNav={phase === 'active'}
        showMidNav={phase === 'profiling' || phase === 'consenting'}
      />
      <Outlet />
    </ParticipantMobileLayout>
  );
}

export function ParticipantPortalShell() {
  return (
    <ParticipantProjectProvider loadDashboard>
      <ParticipantPortalFrame />
    </ParticipantProjectProvider>
  );
}
