import { Link, Navigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberConfirmInboxPanel } from '../components/MemberConfirmInboxPanel';
import { useMemberTripPhaseContext } from '@/hooks/useMemberTripPhase';
import { memberOnboardingPath } from '@/lib/member-onboarding-steps';
import { MEMBER_TRIP_PHASE_HINTS, MEMBER_TRIP_PHASE_LABELS } from '@/lib/member-trip-phase.util';
import { normalizeInviteLabel, unifiedRoleLabel } from '@/lib/trip-member-roles.util';

export default function MemberHomePage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading } = useMemberTripPhaseContext(token);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data?.phase === 'onboarding') {
    return <Navigate to={memberOnboardingPath(token, 'role')} replace />;
  }

  const ctx = data?.inviteContext;
  const phase = data?.phase ?? 'planning';
  const role = normalizeInviteLabel(ctx?.label);

  return (
    <div className="mx-auto min-h-screen max-w-lg space-y-4 px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {ctx?.tripName ?? '我的行程'}
            </CardTitle>
            <Badge variant="outline">{MEMBER_TRIP_PHASE_LABELS[phase]}</Badge>
            {role ? <Badge variant="secondary">{unifiedRoleLabel(role)}</Badge> : null}
          </div>
          <CardDescription>{MEMBER_TRIP_PHASE_HINTS[phase]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            你不需要填写总预算，也不需要自己编排行程。顾问负责设计，你只需确认与个人相关的安排。
          </p>
          {ctx?.tripId ? (
            <Button asChild className="w-full" variant="outline">
              <Link to={`/dashboard/trips/${ctx.tripId}`}>查看行程摘要</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <MemberConfirmInboxPanel inviteCode={token} tripId={ctx?.tripId} />

      {phase === 'completion' ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">行程已结束</CardTitle>
            <CardDescription>欢迎反馈本次体验，帮助顾问优化下一次方案。</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
