import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TripCreationFlowShell } from '@/components/guide-import/TripCreationFlowShell';
import { GuideImportPageShell } from '@/components/guide-import/guide-import-ui';
import { flowStepIndex } from '@/components/guide-import/FlowStepper';
import { MemberOnboardingStepContent } from '../components/MemberOnboardingStepContent';
import { useMemberOnboarding } from '@/hooks/useMemberOnboarding';
import { useTripMemberInviteContext } from '@/hooks/useInviteResolver';
import {
  MEMBER_ONBOARDING_STEPS,
  memberHomePath,
  memberOnboardingStepDef,
  nextMemberOnboardingStepId,
  prevMemberOnboardingStepId,
} from '@/lib/member-onboarding-steps';
import { roleSlotLabel } from '@/lib/trip-member-roles.util';
import type { MemberOnboardingStepId } from '@/types/member-onboarding';

export default function MemberOnboardingPage() {
  const { token = '', stepId = 'role' } = useParams<{
    token: string;
    stepId: MemberOnboardingStepId;
  }>();
  const navigate = useNavigate();
  const currentStepId = (MEMBER_ONBOARDING_STEPS.some((s) => s.id === stepId)
    ? stepId
    : 'role') as MemberOnboardingStepId;

  const { data: inviteContext } = useTripMemberInviteContext(token);
  const { draft, isLoading, saveStep, validateStep, submit } = useMemberOnboarding(token);

  useEffect(() => {
    if (inviteContext?.onboardingCompleted) {
      navigate(memberHomePath(token), { replace: true });
    }
  }, [inviteContext?.onboardingCompleted, navigate, token]);

  if (!MEMBER_ONBOARDING_STEPS.some((s) => s.id === stepId)) {
    return <Navigate to={`/member/${encodeURIComponent(token)}/onboarding/role`} replace />;
  }

  const stepDef = memberOnboardingStepDef(currentStepId);
  const stepIdx = flowStepIndex(MEMBER_ONBOARDING_STEPS, currentStepId);
  const isReview = currentStepId === 'review';

  const handleBack = () => {
    const prev = prevMemberOnboardingStepId(currentStepId);
    if (prev) {
      navigate(`/member/${encodeURIComponent(token)}/onboarding/${prev}`);
      return;
    }
    navigate(`/invite/${encodeURIComponent(token)}`);
  };

  const handleNext = async () => {
    if (!draft) return;
    const error = validateStep(currentStepId);
    if (error) {
      toast.error(error);
      return;
    }

    await saveStep(currentStepId, draft);

    if (isReview) {
      try {
        const res = await submit.mutateAsync({ ...draft, completedAt: new Date().toISOString() });
        toast.success('偏好已提交，顾问将据此设计方案');
        navigate(res.homePath ?? memberHomePath(token));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '提交失败');
      }
      return;
    }

    const next = nextMemberOnboardingStepId(currentStepId);
    if (next) navigate(`/member/${encodeURIComponent(token)}/onboarding/${next}`);
  };

  if (isLoading || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <GuideImportPageShell className="min-h-full">
      <TripCreationFlowShell
        steps={MEMBER_ONBOARDING_STEPS}
        currentStepId={currentStepId}
        navAriaLabel="成员偏好采集步骤"
        title={stepDef.title}
        subtitle={stepDef.subtitle}
        onBack={handleBack}
        dense
        maxWidth="5xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              第 {stepIdx + 1} / {MEMBER_ONBOARDING_STEPS.length} 步 · 无需填写总预算或编排行程
            </p>
            <Button type="button" onClick={() => void handleNext()} disabled={submit.isPending}>
              {submit.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中…
                </>
              ) : (
                <>
                  {isReview ? '确认提交' : '保存并继续'}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        }
      >
        {inviteContext?.tripName ? (
          <p className="mb-4 text-sm text-muted-foreground">
            行程：{inviteContext.tripName}
            {roleSlotLabel(inviteContext.roleSlot) ?? inviteContext.label
              ? ` · ${roleSlotLabel(inviteContext.roleSlot) ?? inviteContext.label}`
              : ''}
          </p>
        ) : null}
        <MemberOnboardingStepContent
          stepId={currentStepId}
          draft={draft}
          onChange={(patch) => {
            void saveStep(currentStepId, { ...draft, ...patch });
          }}
        />
      </TripCreationFlowShell>
    </GuideImportPageShell>
  );
}
