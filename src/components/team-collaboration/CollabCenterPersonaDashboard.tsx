import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DecisionProfilingQuizDialog } from '@/components/decision-profiling/DecisionProfilingQuizDialog';
import { SplitConsensusPanel } from '@/components/decision-profiling/SplitConsensusPanel';
import {
  useDecisionProfilingOnboarding,
  useFrictionRadar,
  useProfileReuse,
  useSplitConsensus,
  useTeamDecisionProfiling,
} from '@/hooks/useDecisionProfiling';
import { useDomainNegotiationTasks } from '@/hooks/useDomainNegotiationTasks';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import type { FrictionDomain, HighRiskAlert } from '@/types/trip-decision-profiling';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import { COLLAB_TAB_SCOPE_COPY } from '@/lib/collab-center-tabs';
import { resolveFrictionNegotiationDeepLink } from '@/lib/collab-friction-navigation';
import { cn } from '@/lib/utils';
import { collabColumnStack, collabDashboardGrid, collabDashboardSpan, collabPageStack } from './collab-dashboard-layout';
import { CollabTabScopeHint } from './widgets/CollabTabScopeHint';
import { PersonaStatusBanner } from './widgets/PersonaStatusBanner';
import { PersonaStyleWallWidget } from './widgets/PersonaStyleWallWidget';
import { PersonaMoneyDnaCompareWidget } from './widgets/PersonaMoneyDnaCompareWidget';
import { PersonaFrictionHeatmapWidget } from './widgets/PersonaFrictionHeatmapWidget';
import { PersonaHighRiskListWidget } from './widgets/PersonaHighRiskListWidget';
import { PersonaNextActionsWidget } from './widgets/PersonaNextActionsWidget';
import { CollabSplitConsensusWidget } from './widgets/CollabSplitConsensusWidget';

interface CollabCenterPersonaDashboardProps {
  tripId: string;
  initialStep?: DecisionProfilingStep | null;
  forceOpenQuiz?: boolean;
  className?: string;
}

export function CollabCenterPersonaDashboard({
  tripId,
  initialStep,
  forceOpenQuiz,
  className,
}: CollabCenterPersonaDashboardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const splitDetailRef = useRef<HTMLDivElement>(null);
  const { data: onboarding, loading: onboardingLoading, reload } = useDecisionProfilingOnboarding(tripId);
  const { data: friction, loading: frictionLoading } = useFrictionRadar(tripId);
  const { data: negotiationTasks = [] } = useDomainNegotiationTasks(tripId);
  const { travelStyles, moneyDna, loading: teamStylesLoading } = useTeamDecisionProfiling(tripId);
  const { data: splitConsensus } = useSplitConsensus(tripId, {
    enabled: Boolean(onboarding?.quizCompleted),
  });
  const { reuse, reusing } = useProfileReuse(tripId);

  const [quizOpen, setQuizOpen] = useState(Boolean(forceOpenQuiz));
  const [quizStep, setQuizStep] = useState<DecisionProfilingStep>(initialStep ?? 'travel_style');
  const [splitDetailOpen, setSplitDetailOpen] = useState(false);

  useEffect(() => {
    if (forceOpenQuiz) {
      setQuizStep(initialStep ?? 'travel_style');
      setQuizOpen(true);
    }
  }, [forceOpenQuiz, initialStep]);

  const navigateToFrictionDecision = useCallback(
    (domain: FrictionDomain) => {
      const { roundDomain, roundId } = resolveFrictionNegotiationDeepLink(
        { domain },
        negotiationTasks,
      );
      const next = mergeCollabDeepLink(searchParams, {
        collabTab: 'decisions',
        roundDomain,
        roundId,
        voteId: null,
        wishId: null,
      });
      setSearchParams(next);
      window.scrollTo(0, 0);
    },
    [negotiationTasks, searchParams, setSearchParams],
  );

  const handleAlertClick = useCallback(
    (alert: HighRiskAlert) => {
      navigateToFrictionDecision(alert.domain);
    },
    [navigateToFrictionDecision],
  );

  const openQuiz = useCallback(() => {
    setQuizStep('travel_style');
    setQuizOpen(true);
  }, []);

  const scrollToSplitDetail = useCallback(() => {
    setSplitDetailOpen(true);
    window.requestAnimationFrame(() => {
      splitDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const goToMembersTab = useCallback(() => {
    const next = mergeCollabDeepLink(searchParams, { collabTab: 'members' });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleQuizCompleted = () => {
    void reload();
  };

  if (onboardingLoading && frictionLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载团队画像…
      </div>
    );
  }

  return (
    <div className={cn(collabPageStack, className)}>
      <CollabTabScopeHint
        action={
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[11px] text-primary"
            onClick={goToMembersTab}
          >
            前往团队与需求（行前问卷）
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        }
      >
        {COLLAB_TAB_SCOPE_COPY.persona}
      </CollabTabScopeHint>

      <PersonaStatusBanner
        friction={friction}
        onboarding={onboarding}
        reusing={reusing}
        onStartQuiz={openQuiz}
        onReuseProfile={() => void reuse().then(() => reload())}
      />

      <div className={collabDashboardGrid}>
        <div className={cn(collabDashboardSpan({ md: 6, lg: 4 }), collabColumnStack)}>
          <PersonaStyleWallWidget
            members={travelStyles}
            loading={teamStylesLoading}
            onOpenQuiz={openQuiz}
          />
          <CollabSplitConsensusWidget
            data={splitConsensus}
            quizCompleted={onboarding?.quizCompleted ?? false}
            onStartQuiz={openQuiz}
            onViewDetail={scrollToSplitDetail}
          />
        </div>

        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <PersonaMoneyDnaCompareWidget tripId={tripId} teamMoneyDna={moneyDna} />
        </div>

        <div className={cn(collabDashboardSpan({ md: 6, lg: 4 }), collabColumnStack)}>
          <PersonaFrictionHeatmapWidget
            pairs={friction?.frictionMatrix ?? []}
            onViewDetail={() => navigateToFrictionDecision('pace')}
          />
          <PersonaHighRiskListWidget
            alerts={friction?.highRiskAlerts ?? []}
            onAlertClick={handleAlertClick}
          />
          <PersonaNextActionsWidget
            alerts={friction?.highRiskAlerts ?? []}
            quizCompleted={onboarding?.quizCompleted ?? false}
            splitConsensus={splitConsensus}
            teamCompletionRate={onboarding?.teamCompletionRate ?? 0}
            memberCount={friction?.memberCount}
            onStartQuiz={openQuiz}
            onConfirmSplit={scrollToSplitDetail}
            onAlertClick={handleAlertClick}
            onViewAll={() => {
              const next = mergeCollabDeepLink(searchParams, { collabTab: 'tasks' });
              setSearchParams(next);
            }}
          />
        </div>
      </div>

      {splitDetailOpen ? (
        <div ref={splitDetailRef} className="rounded-lg border border-border/70 bg-card p-4">
          <SplitConsensusPanel
            tripId={tripId}
            quizCompleted={onboarding?.quizCompleted ?? false}
            travelStyleCompleted={onboarding?.travelStyleCompleted ?? false}
            moneyDnaCompleted={onboarding?.moneyDnaCompleted ?? false}
            teamCompletionRate={onboarding?.teamCompletionRate ?? 0}
            onStartQuiz={openQuiz}
          />
        </div>
      ) : null}

      <DecisionProfilingQuizDialog
        tripId={tripId}
        open={quizOpen}
        onOpenChange={setQuizOpen}
        initialStep={quizStep}
        onCompleted={handleQuizCompleted}
      />
    </div>
  );
}
