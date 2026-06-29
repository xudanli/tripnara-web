import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import { resolveFrictionNegotiationDeepLink } from '@/lib/collab-friction-navigation';
import { cn } from '@/lib/utils';
import { collabDashboardGrid, collabDashboardSpan } from './collab-dashboard-layout';
import { TeamFrictionScoreWidget } from './widgets/TeamFrictionScoreWidget';
import { DecisionStyleSurveyWidget } from './widgets/DecisionStyleSurveyWidget';
import { PersonaNextActionsWidget } from './widgets/PersonaNextActionsWidget';
import { MemberPersonaCardsWidget } from './widgets/MemberPersonaCardsWidget';
import { FrictionMatrixCompactWidget } from './widgets/FrictionMatrixCompactWidget';
import { HighRiskAlertsWidget } from './widgets/HighRiskAlertsWidget';
import { PersonaMoneyDnaWidget } from './widgets/PersonaMoneyDnaWidget';
import { CollabSplitConsensusWidget } from './widgets/CollabSplitConsensusWidget';

interface CollabCenterPersonaDashboardProps {
  tripId: string;
  initialStep?: DecisionProfilingStep | null;
  forceOpenQuiz?: boolean;
  className?: string;
}

function formatFrictionUpdatedAt(iso?: string): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return undefined;
  }
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

  const handleQuizCompleted = () => {
    void reload();
  };

  const compatibility = friction?.compatibility;
  const frictionScore = compatibility ? Math.round(compatibility.overallScore) : 72;
  const frictionSummary = compatibility
    ? `团队整体方向一致，但在预算分配与行程节奏上存在差异。预算重叠 ${compatibility.budgetOverlapPct}% · 节奏同步 ${compatibility.paceSyncPct}%`
    : '完成团队调查后可查看摩擦分与合拍度。';
  const frictionCoefficient = compatibility
    ? Math.round(100 - compatibility.styleSimilarityPct)
    : undefined;

  if (onboardingLoading && frictionLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载团队画像…
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className={collabDashboardGrid}>
        <div className={collabDashboardSpan({ md: 6, lg: 6 })}>
          <TeamFrictionScoreWidget
            score={frictionScore}
            bandLabel={compatibility?.bandLabel ?? '中度摩擦'}
            summary={frictionSummary}
            updatedAt={formatFrictionUpdatedAt(friction?.computedAt)}
            onViewDetail={() => navigateToFrictionDecision('budget')}
          />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 6 })}>
          <DecisionStyleSurveyWidget
            onboarding={onboarding}
            memberCount={friction?.memberCount}
            reusing={reusing}
            onStartQuiz={openQuiz}
            onReuseProfile={() => void reuse().then(() => reload())}
          />
        </div>

        <div className={collabDashboardSpan({ md: 6, lg: 12 })}>
          <MemberPersonaCardsWidget members={travelStyles} loading={teamStylesLoading} />
        </div>

        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <PersonaMoneyDnaWidget
            tripId={tripId}
            teamMoneyDna={moneyDna}
            frictionCoefficientPct={frictionCoefficient}
          />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <FrictionMatrixCompactWidget
            pairs={friction?.frictionMatrix ?? []}
            onDomainClick={navigateToFrictionDecision}
            onViewDetail={() => navigateToFrictionDecision('pace')}
          />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <CollabSplitConsensusWidget
            data={splitConsensus}
            quizCompleted={onboarding?.quizCompleted ?? false}
            onStartQuiz={openQuiz}
            onViewDetail={scrollToSplitDetail}
          />
        </div>

        <div className={collabDashboardSpan({ md: 6, lg: 8 })}>
          <HighRiskAlertsWidget
            alerts={friction?.highRiskAlerts ?? []}
            onAlertClick={handleAlertClick}
          />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <PersonaNextActionsWidget
            alerts={friction?.highRiskAlerts ?? []}
            quizCompleted={onboarding?.quizCompleted ?? false}
            splitConsensus={splitConsensus}
            teamCompletionRate={onboarding?.teamCompletionRate ?? 0}
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
