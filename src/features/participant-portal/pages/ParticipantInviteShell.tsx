import { Navigate, Outlet, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/common/Logo';
import type { ParticipantInviteLanding } from '@/types/participant-portal';
import {
  ParticipantProjectProvider,
  useParticipantProject,
} from '../shell/ParticipantProjectProvider';
import { portalPathForPhase } from '../shell/participant-phase';
import InviteLandingPage from './InviteLandingPage';

function InviteExpiredCard({ invite }: { invite: ParticipantInviteLanding }) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6 text-center text-sm">
        <p className="font-medium">邀请已过期</p>
        <p className="mt-2 text-muted-foreground">{invite.project.title}</p>
        <p className="mt-2 text-muted-foreground">
          {invite.canRequestResend
            ? '请联系邀请方重新发送邀请链接。'
            : '请联系您的旅行顾问或组织者。'}
        </p>
      </CardContent>
    </Card>
  );
}

function InviteFrame() {
  const { invite, isLoading, isError, errorGuide } = useParticipantProject();

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
            <p className="font-medium">{errorGuide?.title ?? '无法加载邀请'}</p>
            <p className="mt-2 text-muted-foreground">
              {errorGuide?.description ?? '邀请链接可能已失效，请联系邀请方重新发送。'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <InviteExpiredCard invite={invite} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background/95 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Logo className="h-7 w-auto" size={28} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{invite.project.title}</p>
            <p className="text-xs text-muted-foreground">旅行邀请</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export function ParticipantInviteShell() {
  return (
    <ParticipantProjectProvider>
      <InviteFrame />
    </ParticipantProjectProvider>
  );
}

export function ParticipantInviteEntryPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { phase, isLoading, invite } = useParticipantProject();

  if (isLoading || !invite) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (phase !== 'joining') {
    return <Navigate to={portalPathForPhase(token, phase)} replace />;
  }

  return <InviteLandingPage />;
}
