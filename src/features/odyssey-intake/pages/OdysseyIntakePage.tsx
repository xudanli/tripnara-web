import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { OdysseyIntakeWizard } from '../components/OdysseyIntakeWizard';
import { TravelPersonaCard } from '../components/TravelPersonaCard';
import { MatchCandidateList } from '../components/MatchCandidateList';
import { TrustVerifyStep } from '../components/TrustVerifyStep';
import { TripMetaStep } from '../components/TripMetaStep';
import { useOdysseyOnboardingStatus } from '@/hooks/useOdysseyIntake';
import { invalidateOdysseyProfileCard, useOdysseyProfileCard } from '@/hooks/useOdysseyProfileCard';
import { odysseyIntakeApi, OdysseyIntakeApiError } from '@/api/odyssey-intake';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type {
  CompanionMatch,
  OdysseyIdentityCard,
  OdysseyOnboardingStatus,
  OdysseySubmitRequest,
} from '@/types/odyssey-intake';

type Phase = 'loading' | 'quiz' | 'card' | 'trust' | 'trip_meta' | 'matching' | 'result';

function phaseFromStatus(status: OdysseyOnboardingStatus): Phase {
  if (!status.quizComplete) return 'quiz';
  if (status.nextStep === 'trust_verify' || !status.trustVerified) return 'trust';
  if (status.nextStep === 'view_card' && status.cardReady) return 'card';
  if (!status.canMatch) return 'trip_meta';
  if (status.nextStep === 'match' || status.canMatch) return 'matching';
  return 'quiz';
}

export default function OdysseyIntakePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRetake = searchParams.get('retake') === '1';

  const queryClient = useQueryClient();
  const statusQuery = useOdysseyOnboardingStatus();
  const profileCardQuery = useOdysseyProfileCard();

  const [phase, setPhase] = useState<Phase>(isRetake ? 'quiz' : 'loading');
  const [submitting, setSubmitting] = useState(false);
  const [resultCard, setResultCard] = useState<OdysseyIdentityCard | null>(null);
  const [matches, setMatches] = useState<CompanionMatch[]>([]);
  const [tripMetaInitial, setTripMetaInitial] = useState<{
    destination?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const matchStartedRef = useRef(false);

  useEffect(() => {
    if (isRetake) {
      setPhase('quiz');
      matchStartedRef.current = false;
      return;
    }
    if (statusQuery.isLoading) return;
    if (statusQuery.isError) {
      setPhase('quiz');
      return;
    }
    if (statusQuery.data) {
      setPhase(phaseFromStatus(statusQuery.data));
    }
  }, [statusQuery.data, statusQuery.isLoading, statusQuery.isError, isRetake]);

  useEffect(() => {
    if (isRetake || phase === 'quiz' || phase === 'loading') return;
    if (!resultCard && profileCardQuery.cardView?.profile?.card) {
      setResultCard(profileCardQuery.cardView.profile.card);
    }
  }, [profileCardQuery.cardView, resultCard, isRetake, phase]);

  const runMatch = async () => {
    setPhase('matching');
    const start = Date.now();
    try {
      const result = await odysseyIntakeApi.match();
      const elapsed = Date.now() - start;
      if (elapsed < 800) await new Promise((r) => setTimeout(r, 800 - elapsed));
      setMatches(result.matches);
      setPhase('result');
      invalidateOdysseyProfileCard(queryClient);
    } catch {
      setPhase('trip_meta');
    }
  };

  useEffect(() => {
    if (phase === 'matching' && !matchStartedRef.current) {
      matchStartedRef.current = true;
      void runMatch();
    }
  }, [phase]);

  const handleIntakeComplete = async (payload: OdysseySubmitRequest) => {
    setSubmitting(true);
    const start = Date.now();
    const request: OdysseySubmitRequest = {
      ...payload,
      intakeVersion: 'premium_v2',
      retake: isRetake || undefined,
    };

    try {
      const status = statusQuery.data;
      if (!isRetake && status?.trustVerified) {
        const merged = await odysseyIntakeApi.submitAndMatch(request);
        setResultCard(merged.card);
        setMatches(merged.matches);
        const elapsed = Date.now() - start;
        if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed));
        setPhase('result');
        invalidateOdysseyProfileCard(queryClient);
        return;
      }

      const submitted = await odysseyIntakeApi.submit(request);
      setResultCard(submitted.card);
      await statusQuery.refetch();
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      setPhase('card');
      invalidateOdysseyProfileCard(queryClient);
      if (isRetake) navigate('/dashboard/tripnara/odyssey', { replace: true });
    } catch (error) {
      const message =
        error instanceof OdysseyIntakeApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : '提交失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrustVerify = async (provider: 'zhima_credit', authToken?: string) => {
    setSubmitting(true);
    try {
      const result = await odysseyIntakeApi.verifyTrust({ provider, authToken });
      await statusQuery.refetch();
      setPhase(result.onboarding.canMatch ? 'matching' : 'trip_meta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTripMeta = async (payload: {
    destination: string;
    startDate: string;
    endDate: string;
  }) => {
    setSubmitting(true);
    try {
      await odysseyIntakeApi.updateTripMeta(payload);
      setTripMetaInitial(payload);
      matchStartedRef.current = false;
      await runMatch();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    void statusQuery.refetch();
  };

  const startRetake = () => {
    navigate('/dashboard/tripnara/odyssey?retake=1');
  };

  if (!isRetake && phase === 'loading') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <LogoLoading size={48} />
      </div>
    );
  }

  if (phase === 'quiz') {
    return (
      <OdysseyIntakeWizard
        onComplete={handleIntakeComplete}
        onCancel={() => navigate('/dashboard/profile')}
        isSubmitting={submitting}
      />
    );
  }

  if (phase === 'trust') {
    return <TrustVerifyStep onVerify={handleTrustVerify} isLoading={submitting} />;
  }

  if (phase === 'trip_meta') {
    return (
      <TripMetaStep initial={tripMetaInitial} onSubmit={handleTripMeta} isLoading={submitting} />
    );
  }

  if (phase === 'matching') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background text-foreground">
        <LogoLoading size={48} />
        <motion.p
          className="mt-6 text-lg text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          正在计算契合搭子…
        </motion.p>
      </div>
    );
  }

  const displayCard = resultCard ?? profileCardQuery.cardView?.profile?.card ?? null;

  if ((phase === 'card' || phase === 'result') && displayCard) {
    return (
      <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
          <h1 className="mb-2 text-center text-2xl font-semibold">你的旅行身份名片</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            长按保存分享
            {matches.length > 0 ? ' · 已为你匹配契合旅伴' : ''}
          </p>
          <TravelPersonaCard card={displayCard} className="mb-8" />
          {matches.length > 0 && (
            <>
              <h2 className="mb-3 text-lg font-medium">契合搭子推荐</h2>
              <MatchCandidateList matches={matches} />
            </>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" onClick={() => navigate('/dashboard/profile')}>
              查看我的主页
            </Button>
            {phase === 'card' && (
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  if (!statusQuery.data?.trustVerified) setPhase('trust');
                  else if (!statusQuery.data?.canMatch) setPhase('trip_meta');
                  else {
                    matchStartedRef.current = false;
                    void runMatch();
                  }
                }}
              >
                {!statusQuery.data?.trustVerified
                  ? '继续安全授权'
                  : !statusQuery.data?.canMatch
                    ? '设置行程并匹配'
                    : '查看旅伴推荐'}
              </Button>
            )}
            <Button className="flex-1" variant="outline" onClick={startRetake}>
              重新入网
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4">
      <p className="text-muted-foreground">无法加载入网流程，请稍后重试</p>
      {statusQuery.isError && (
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          {statusQuery.error instanceof Error ? statusQuery.error.message : 'onboarding/status 请求失败'}
        </p>
      )}
      <Button onClick={handleRetry}>重试</Button>
    </div>
  );
}
