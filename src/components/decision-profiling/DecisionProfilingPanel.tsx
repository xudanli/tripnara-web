import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { isDecisionProfilingReuseEnabled } from '@/lib/decision-profiling-reuse-feature';
import type { DecisionProfilingSurface } from '@/lib/decision-profiling-navigation';
import { useDecisionProfilingOnboarding, useMyMoneyDna, useMyTravelStyle, useProfileReuse } from '@/hooks/useDecisionProfiling';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import { DecisionProfilingBanner } from './DecisionProfilingBanner';
import { DecisionProfilingQuizDialog } from './DecisionProfilingQuizDialog';
import { FrictionRadarPanel } from './FrictionRadarPanel';
import { MoneyDnaCardView } from './MoneyDnaCardView';
import { SplitConsensusPanel } from './SplitConsensusPanel';
import { TeamStyleWall } from './TeamStyleWall';
import { TravelStyleCardView } from './TravelStyleCardView';
import { profilingPanelHeader, profilingPanelShell } from './decision-profiling-ui';

interface DecisionProfilingPanelProps {
  tripId: string;
  className?: string;
  initialStep?: DecisionProfilingStep | null;
  forceOpenQuiz?: boolean;
  forceReuseProfile?: boolean;
  /** 打开 Hub 时展开的面板（摩擦 / 分摊等） */
  initialSurface?: DecisionProfilingSurface | null;
  /** 弹窗内嵌：无卡片外壳与折叠头 */
  variant?: 'card' | 'embedded';
}

export function DecisionProfilingPanel({
  tripId,
  className,
  initialStep,
  forceOpenQuiz,
  forceReuseProfile,
  initialSurface,
  variant = 'card',
}: DecisionProfilingPanelProps) {
  const embedded = variant === 'embedded';
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: onboarding, loading, error, reload } = useDecisionProfilingOnboarding(tripId);
  const {
    card: travelStyleCard,
    reload: reloadTravelStyle,
  } = useMyTravelStyle(tripId);
  const {
    card: moneyDnaCard,
    reload: reloadMoneyDna,
  } = useMyMoneyDna(tripId);
  const { reuse, reusing } = useProfileReuse(tripId);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState<DecisionProfilingStep>('travel_style');
  const [quizPrefillOnOpen, setQuizPrefillOnOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [frictionOpen, setFrictionOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [travelStyleOpen, setTravelStyleOpen] = useState(true);
  const [moneyDnaOpen, setMoneyDnaOpen] = useState(true);
  const [teamWallOpen, setTeamWallOpen] = useState(true);

  const openQuiz = useCallback(
    (step: DecisionProfilingStep = 'travel_style', withPrefill = false) => {
      setQuizStep(step);
      setQuizPrefillOnOpen(withPrefill);
      setQuizOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!onboarding) return;
    setFrictionOpen(onboarding.quizCompleted || onboarding.teamCompletionRate >= 50);
    setSplitOpen(onboarding.quizCompleted);
    setTravelStyleOpen(onboarding.travelStyleCompleted || embedded);
    setMoneyDnaOpen(onboarding.moneyDnaCompleted || embedded);
  }, [onboarding, embedded]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{
        tripId: string;
        step?: DecisionProfilingStep;
        surface?: DecisionProfilingSurface;
      }>).detail;
      if (detail?.tripId !== tripId) return;
      if (detail.surface === 'friction') {
        setFrictionOpen(true);
        return;
      }
      if (detail.surface === 'split_consensus') {
        setSplitOpen(true);
        return;
      }
      if (detail.surface === 'team_styles') {
        setTeamWallOpen(true);
        return;
      }
      if (detail.surface === 'quiz' || !detail.surface) {
        openQuiz(detail.step ?? 'travel_style');
      }
    };
    window.addEventListener('plan-studio:open-decision-profiling', handler);
    return () => window.removeEventListener('plan-studio:open-decision-profiling', handler);
  }, [tripId, openQuiz]);

  const handleQuizCompleted = () => {
    void reload();
    void reloadTravelStyle();
    void reloadMoneyDna();
    setFrictionOpen(true);
    setSplitOpen(true);
    setTravelStyleOpen(true);
    setMoneyDnaOpen(true);
  };

  const handleReuseProfile = async () => {
    const result = await reuse();
    if (!result) return;
    void reload();
    void reloadTravelStyle();
    void reloadMoneyDna();
    handleQuizCompleted();
  };

  const applyProfilingSurface = useCallback(
    (surface: DecisionProfilingSurface | null | undefined, step?: DecisionProfilingStep) => {
      if (!surface || surface === 'hub') return;
      if (surface === 'quiz') {
        openQuiz(step ?? 'travel_style');
        return;
      }
      if (surface === 'reuse') {
        void handleReuseProfile();
        return;
      }
      if (surface === 'friction') setFrictionOpen(true);
      if (surface === 'split_consensus') setSplitOpen(true);
      if (surface === 'team_styles') setTeamWallOpen(true);
    },
    [openQuiz],
  );

  useEffect(() => {
    const surfaceParam = (initialSurface ??
      searchParams.get('decisionProfilingSurface')) as DecisionProfilingSurface | null;
    const stepParam = (initialStep ?? searchParams.get('decisionProfilingStep')) as DecisionProfilingStep | null;
    const openProfiling = searchParams.get('openDecisionProfiling') === '1' || Boolean(initialSurface);

    if (!openProfiling && !forceOpenQuiz && !forceReuseProfile) return;

    if (forceReuseProfile) {
      void handleReuseProfile();
    } else if (surfaceParam === 'quiz' || (forceOpenQuiz && !surfaceParam)) {
      const step = stepParam === 'overview' || !stepParam ? 'travel_style' : stepParam;
      openQuiz(step, searchParams.get('decisionProfilingPrefill') === '1');
    } else if (surfaceParam) {
      applyProfilingSurface(surfaceParam, stepParam ?? undefined);
    }

    if (searchParams.get('openDecisionProfiling') || searchParams.get('decisionProfilingSurface')) {
      const next = new URLSearchParams(searchParams);
      next.delete('openDecisionProfiling');
      next.delete('decisionProfilingStep');
      next.delete('decisionProfilingPrefill');
      next.delete('decisionProfilingAction');
      next.delete('decisionProfilingSurface');
      setSearchParams(next, { replace: true });
    }
  }, [
    applyProfilingSurface,
    forceOpenQuiz,
    forceReuseProfile,
    initialSurface,
    initialStep,
    openQuiz,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!initialSurface) return;
    applyProfilingSurface(initialSurface, initialStep ?? undefined);
  }, [applyProfilingSurface, initialSurface, initialStep]);

  const reuseAttemptedRef = useRef(false);

  useEffect(() => {
    if (
      !forceReuseProfile ||
      reuseAttemptedRef.current ||
      !onboarding ||
      reusing ||
      onboarding.quizCompleted
    ) {
      return;
    }
    if (!isDecisionProfilingReuseEnabled() || !onboarding.reuse?.eligible) return;
    reuseAttemptedRef.current = true;
    void handleReuseProfile();
  }, [forceReuseProfile, onboarding, reusing]);

  if (loading && !onboarding) {
    return (
      <>
        <div className={cn(embedded ? className : profilingPanelShell(className))}>
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        </div>
        <DecisionProfilingQuizDialog
          tripId={tripId}
          open={quizOpen}
          onOpenChange={setQuizOpen}
          initialStep={quizStep}
          prefillOnOpen={quizPrefillOnOpen}
          onCompleted={handleQuizCompleted}
        />
      </>
    );
  }

  if (error && !onboarding) {
    return null;
  }

  if (!onboarding) return null;

  const inferredPreview =
    travelStyleCard?.source === 'inferred' &&
    !onboarding.travelStyleCompleted &&
    !(isDecisionProfilingReuseEnabled() && onboarding.reuse?.eligible);

  const body = (
    <div className={cn(embedded ? 'space-y-5' : 'p-5 space-y-5', className)}>
      <DecisionProfilingBanner
        onboarding={onboarding}
        travelStyleCard={travelStyleCard}
        onStartQuiz={(opts) => openQuiz('travel_style', opts?.prefill ?? false)}
        onReuseProfile={() => void handleReuseProfile()}
        reusing={reusing}
      />

      <details
        className="rounded-md border px-4 py-3"
        open={teamWallOpen}
        onToggle={(e) => setTeamWallOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-medium select-none">团队风格墙</summary>
        <div className="mt-3 border-t pt-3">
          <TeamStyleWall tripId={tripId} />
        </div>
      </details>

      <details
        className="rounded-md border px-4 py-3"
        open={frictionOpen}
        onToggle={(e) => setFrictionOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-medium select-none">摩擦预警仪表盘 · 团队摩擦矩阵</summary>
        <div className="mt-3 border-t pt-3">
          <FrictionRadarPanel tripId={tripId} enabled={frictionOpen || onboarding.quizCompleted} />
        </div>
      </details>

      <details
        className="rounded-md border px-4 py-3"
        open={splitOpen}
        onToggle={(e) => setSplitOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-medium select-none">分摊机制共识</summary>
        <div className="mt-3 border-t pt-3">
          <SplitConsensusPanel
            tripId={tripId}
            quizCompleted={onboarding.quizCompleted}
            travelStyleCompleted={onboarding.travelStyleCompleted}
            moneyDnaCompleted={onboarding.moneyDnaCompleted}
            teamCompletionRate={onboarding.teamCompletionRate}
            onStartQuiz={() => openQuiz()}
          />
        </div>
      </details>

      <details
        className="rounded-md border px-4 py-3"
        open={travelStyleOpen}
        onToggle={(e) => setTravelStyleOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-medium select-none">Travel Style · 我的旅行风格</summary>
        <div className="mt-3 border-t pt-3">
          <TravelStyleCardView
            tripId={tripId}
            incompleteSurvey={inferredPreview}
          />
        </div>
      </details>

      <details
        className="rounded-md border px-4 py-3"
        open={moneyDnaOpen}
        onToggle={(e) => setMoneyDnaOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-medium select-none">Money DNA · 我的消费 DNA</summary>
        <div className="mt-3 border-t pt-3">
          <MoneyDnaCardView tripId={tripId} card={moneyDnaCard} />
        </div>
      </details>
    </div>
  );

  return (
    <>
      {embedded ? (
        body
      ) : (
        <section className={cn(profilingPanelShell(className))}>
          <div className={profilingPanelHeader()}>
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold">决策风格画像 · 摩擦预警</h3>
                <p className="text-xs text-muted-foreground">Travel Style · Money DNA · 分摊共识</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!onboarding.quizCompleted ? (
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => openQuiz()}>
                  开始调查
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? '收起' : '展开'}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {expanded ? body : null}
        </section>
      )}

      <DecisionProfilingQuizDialog
        tripId={tripId}
        open={quizOpen}
        onOpenChange={setQuizOpen}
        initialStep={quizStep}
        prefillOnOpen={quizPrefillOnOpen}
        onCompleted={handleQuizCompleted}
      />
    </>
  );
}
