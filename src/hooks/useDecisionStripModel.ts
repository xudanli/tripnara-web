import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  mapPlanningReadinessToStripCta,
  type PlanningReadinessPresentation,
} from '@/lib/decision-strip-planning-readiness';
import { planningWorkbenchApi, pickWorkbenchOptionComparison } from '@/api/planning-workbench';
import {
  buildDecisionStripCompareSummary,
  resolveDecisionStripPersonaLine,
  resolveDecisionStripPresentation,
  resolveDecisionStripPrimaryCta,
  resolveDecisionStripNeedConfirmationPresentation,
  resolveDecisionStripNegotiationPresentation,
  resolveDecisionStripScore,
  shouldHidePlanningBannerForStrip,
  type DecisionStripCompareSummary,
  type DecisionStripPersonaLine,
  type DecisionStripPrimaryCta,
  type DecisionStripState,
} from '@/lib/decision-strip-model';
import { resolvePlanningBannerText } from '@/lib/world-model-guards';
import { pickDecisionCockpitStripSummary } from '@/lib/decision-cockpit';
import { pickRouteRunConfirmationFromResponse } from '@/lib/route-run-confirmation';
import { pickRouteRunNegotiationFromResponse } from '@/lib/route-run-negotiation';
import {
  pickComparisonFromRouteRun,
  pickOptimizeSuggestedOperation,
} from '@/lib/decision-strip-route-run';
import { usePlanStudioCompareStore } from '@/store/planStudioCompareStore';
import { usePlanningTaskStore } from '@/store/planningTaskStore';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';
import { tripsApi } from '@/api/trips';
import { resolveTripPersonaAlerts } from '@/lib/resolve-trip-persona-alerts';
import type { PersonaAlert } from '@/types/trip';

export interface DecisionStripModel {
  state: DecisionStripState;
  headline: string | null;
  subline: string | null;
  compareSummary: DecisionStripCompareSummary | null;
  personaLine: DecisionStripPersonaLine | null;
  score: number | null;
  primaryCta: DecisionStripPrimaryCta;
  optimizeMessage?: string;
  hidePlanningBanner: boolean;
  showStrip: boolean;
  loading: boolean;
  taskMessage: string;
  taskPhase: string;
  taskProgress: number;
  lastRequestId: string | undefined;
  personaAlerts: PersonaAlert[];
  orchestrationRunning: boolean;
  planningReadiness: PlanningReadinessPresentation | null;
  /** 规划待办收件箱计数（与可执行证明入口角标同步） */
  planningInboxCount: number;
  reload: () => void;
}

async function fetchWorkbenchComparison(tripId: string) {
  try {
    const workbench = await planningWorkbenchApi.getTripWorkbench(tripId);
    if (!workbench.currentPlan) return undefined;
    return pickWorkbenchOptionComparison([
      {
        uiOutput: workbench.currentPlan.uiOutput,
        planState: workbench.currentPlan.planState,
      },
    ]);
  } catch {
    return undefined;
  }
}

export function useDecisionStripModel(
  tripId: string | null | undefined,
  options?: {
    planningReadiness?: PlanningReadinessPresentation | null;
    planningInboxCount?: number;
    /** 首屏延后 persona / workbench 对比请求，减轻与 conflicts 并发 */
    deferRemoteFetch?: boolean;
  },
): DecisionStripModel {
  const planningReadiness = options?.planningReadiness ?? null;
  const planningInboxCount = options?.planningInboxCount ?? 0;
  const deferRemoteFetch = options?.deferRemoteFetch ?? false;
  const worldModelGuards = useWorldModelGuardsStore((s) => s.worldModelGuards);
  const explainOptimization = useWorldModelGuardsStore((s) => s.explainOptimization);
  const decisionCockpit = useWorldModelGuardsStore((s) => s.decisionCockpit);
  const lastRequestId = useWorldModelGuardsStore((s) => s.lastRequestId);
  const routeRunConfirmation = useWorldModelGuardsStore((s) => s.routeRunConfirmation);
  const routeRunNegotiation = useWorldModelGuardsStore((s) => s.routeRunNegotiation);
  const taskStatus = usePlanningTaskStore((s) => s.status);
  const taskMessage = usePlanningTaskStore((s) => s.message);
  const taskPhase = usePlanningTaskStore((s) => s.currentPhase);
  const taskProgress = usePlanningTaskStore((s) => s.progressPercentage);
  const taskResult = usePlanningTaskStore((s) => s.resultData);

  const cachedComparison = usePlanStudioCompareStore((s) =>
    tripId ? s.byTripId[tripId] : undefined,
  );

  const [personaAlerts, setPersonaAlerts] = useState<PersonaAlert[]>([]);
  const [remoteComparison, setRemoteComparison] = useState(
    () => cachedComparison,
  );
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const [remoteFetchEnabled, setRemoteFetchEnabled] = useState(!deferRemoteFetch);

  useEffect(() => {
    if (!deferRemoteFetch) {
      setRemoteFetchEnabled(true);
      return;
    }
    if (!tripId) {
      setRemoteFetchEnabled(false);
      return;
    }
    const enable = () => setRemoteFetchEnabled(true);
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(enable, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const timer = window.setTimeout(enable, 1200);
    return () => window.clearTimeout(timer);
  }, [tripId, deferRemoteFetch]);

  useEffect(() => {
    if (!tripId || !remoteFetchEnabled) {
      if (!tripId) {
        setPersonaAlerts([]);
        setRemoteComparison(undefined);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const storeCmp = usePlanStudioCompareStore.getState().getComparison(tripId);
        const [alerts, comparison] = await Promise.all([
          tripsApi.getPersonaAlerts(tripId, { phase: 'planning' }).catch(() => [] as PersonaAlert[]),
          storeCmp ? Promise.resolve(storeCmp) : fetchWorkbenchComparison(tripId),
        ]);

        if (cancelled) return;
        setPersonaAlerts(alerts);
        if (comparison) {
          setRemoteComparison(comparison);
          usePlanStudioCompareStore.getState().setComparison(tripId, comparison);
        } else {
          setRemoteComparison(undefined);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, reloadToken, remoteFetchEnabled]);

  useEffect(() => {
    if (cachedComparison) setRemoteComparison(cachedComparison);
  }, [cachedComparison]);

  useEffect(() => {
    const onComparisonUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string }>).detail;
      if (detail?.tripId && detail.tripId !== tripId) return;
      reload();
    };
    const onScheduleRefresh = () => reload();
    const onLoopReadinessChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string }>).detail;
      if (detail?.tripId && detail.tripId !== tripId) return;
      reload();
    };
    window.addEventListener('plan-studio:comparison-updated', onComparisonUpdated);
    window.addEventListener('plan-studio:schedule-refresh', onScheduleRefresh);
    window.addEventListener('plan-studio:loop-readiness-changed', onLoopReadinessChanged);
    return () => {
      window.removeEventListener('plan-studio:comparison-updated', onComparisonUpdated);
      window.removeEventListener('plan-studio:schedule-refresh', onScheduleRefresh);
      window.removeEventListener('plan-studio:loop-readiness-changed', onLoopReadinessChanged);
    };
  }, [tripId, reload]);

  useEffect(() => {
    if (!tripId || !taskResult) return;
    const fromRouteRun = pickComparisonFromRouteRun(taskResult);
    if (fromRouteRun?.recommendation) {
      usePlanStudioCompareStore.getState().setComparison(tripId, fromRouteRun);
      setRemoteComparison(fromRouteRun);
    }
  }, [tripId, taskResult]);

  const confirmationFromTask = useMemo(
    () => (taskResult ? pickRouteRunConfirmationFromResponse(taskResult) : null),
    [taskResult],
  );

  const negotiationFromTask = useMemo(
    () => (taskResult ? pickRouteRunNegotiationFromResponse(taskResult) : null),
    [taskResult],
  );

  return useMemo(() => {
    const effectiveConfirmation = routeRunConfirmation ?? confirmationFromTask;
    const effectiveNegotiation = routeRunNegotiation ?? negotiationFromTask;
    const isRunning = taskStatus === 'PROCESSING';
    const isError = taskStatus === 'FAILED';

    const resolvedPersonaAlerts = resolveTripPersonaAlerts(personaAlerts);

    const comparison = remoteComparison ?? cachedComparison;
    const compareSummary = buildDecisionStripCompareSummary(comparison);
    const personaResolution = resolveDecisionStripPersonaLine(resolvedPersonaAlerts);
    const personaLine = personaResolution.line;
    const personaMode = personaResolution.mode;
    const personaLeadHeadline = personaResolution.leadHeadline;
    const decisionCockpitSummary = pickDecisionCockpitStripSummary(decisionCockpit);
    const scoreFromOptimization = resolveDecisionStripScore(explainOptimization);
    const fallbackAnswer = taskResult?.answer_text;

    const optimizeSuggested = pickOptimizeSuggestedOperation(taskResult);

    const presentation = resolveDecisionStripPresentation({
      guards: worldModelGuards,
      compareSummary,
      personaLine,
      fallbackAnswerText: fallbackAnswer,
      explainOptimization,
    });

    let state: DecisionStripState = presentation.state;
    let headline: string | null = presentation.headline;
    let subline: string | null = presentation.subline;
    let primaryCta: DecisionStripPrimaryCta = resolveDecisionStripPrimaryCta({
      guards: worldModelGuards,
      compareSummary,
      hasBlockGuard:
        worldModelGuards?.segment_editor_mode === 'readonly' ||
        Boolean(resolvePlanningBannerText(worldModelGuards)?.includes('不可')),
      optimizeSuggested,
      needConfirmation: effectiveConfirmation,
      needNegotiation: effectiveNegotiation
        ? {
            negotiationSessionId: effectiveNegotiation.payload.negotiation_session_id,
            impact: effectiveNegotiation.payload.impact,
            reason: effectiveNegotiation.payload.reason,
          }
        : null,
    });
    let score: number | null = scoreFromOptimization;

    if (isRunning) {
      state = 'running';
      headline = taskMessage?.trim() || '规划师正在处理…';
      subline = personaLine
        ? `${personaLine.personaLabel}：${personaLine.text}`
        : compareSummary?.reason ?? null;
      primaryCta = { type: 'open_assistant' };
    } else if (isError) {
      state = 'error';
      headline = taskMessage?.trim() || '规划任务失败，请重试';
    }

    const hasBlockGuard =
      worldModelGuards?.segment_editor_mode === 'readonly' ||
      Boolean(resolvePlanningBannerText(worldModelGuards)?.includes('不可'));

    if (!isRunning && !isError && compareSummary) {
      primaryCta = resolveDecisionStripPrimaryCta({
        guards: worldModelGuards,
        compareSummary,
        hasBlockGuard,
        optimizeSuggested,
        needConfirmation: effectiveConfirmation,
        needNegotiation: effectiveNegotiation
          ? {
              negotiationSessionId: effectiveNegotiation.payload.negotiation_session_id,
              impact: effectiveNegotiation.payload.impact,
              reason: effectiveNegotiation.payload.reason,
            }
          : null,
      });
    }

    if (
      !isRunning &&
      !isError &&
      effectiveConfirmation &&
      !compareSummary
    ) {
      const confirmationPresentation = resolveDecisionStripNeedConfirmationPresentation(
        effectiveConfirmation,
      );
      headline = confirmationPresentation.headline;
      subline = confirmationPresentation.subline;
      state = confirmationPresentation.state;
      primaryCta = { type: 'confirm_continue' };
    }

    if (
      !isRunning &&
      !isError &&
      effectiveNegotiation &&
      !compareSummary &&
      !effectiveConfirmation
    ) {
      const negotiationPresentation = resolveDecisionStripNegotiationPresentation({
        impact: effectiveNegotiation.payload.impact,
        reason: effectiveNegotiation.payload.reason,
        recommendationSummary: effectiveNegotiation.payload.recommendation_summary,
      });
      headline = negotiationPresentation.headline;
      subline = negotiationPresentation.subline;
      state = negotiationPresentation.state;
      primaryCta = { type: 'open_negotiation' };
    }

    if (
      !isRunning &&
      !isError &&
      personaMode === 'single_lead' &&
      personaLeadHeadline &&
      !compareSummary &&
      !effectiveConfirmation &&
      !effectiveNegotiation
    ) {
      headline = personaLeadHeadline;
      if (personaLine?.text && personaLine.text.trim() !== personaLeadHeadline.trim()) {
        subline = personaLine.text;
      } else if (personaLine?.personaLabel) {
        subline = `${personaLine.personaLabel} · 单主角评估`;
      }
      if (state === 'idle') state = 'conclusion';
    }

    if (
      !isRunning &&
      !isError &&
      !compareSummary &&
      !effectiveConfirmation &&
      !effectiveNegotiation &&
      decisionCockpitSummary &&
      !subline?.trim()
    ) {
      subline = decisionCockpitSummary.headline;
    }

    if (
      !isRunning &&
      !isError &&
      !compareSummary &&
      planningReadiness?.active &&
      !effectiveConfirmation &&
      !effectiveNegotiation
    ) {
      headline = planningReadiness.headline;
      subline = planningReadiness.subline ?? subline;
      state = planningReadiness.tone === 'blocked' ? 'blocked' : state === 'idle' ? 'conclusion' : state;
      primaryCta = mapPlanningReadinessToStripCta(planningReadiness.primaryCta);
    }

    const hasHeadline = Boolean(headline);
    const hidePlanningBanner = shouldHidePlanningBannerForStrip({
      stripState: state,
      hasCompare: Boolean(compareSummary),
      hasHeadline,
    });

    const showStrip = Boolean(tripId);

    return {
      state,
      headline,
      subline,
      compareSummary,
      personaLine,
      personaMode,
      personaLeadHeadline,
      decisionCockpitSummary,
      score,
      primaryCta,
      optimizeMessage: optimizeSuggested?.message,
      hidePlanningBanner,
      showStrip,
      loading,
      taskMessage,
      taskPhase,
      taskProgress,
      lastRequestId,
      personaAlerts: resolvedPersonaAlerts,
      orchestrationRunning: isRunning,
      planningReadiness,
      planningInboxCount,
      reload,
    };
  }, [
    taskStatus,
    remoteComparison,
    cachedComparison,
    personaAlerts,
    explainOptimization,
    taskResult,
    worldModelGuards,
    decisionCockpit,
    routeRunConfirmation,
    confirmationFromTask,
    routeRunNegotiation,
    negotiationFromTask,
    taskMessage,
    taskPhase,
    taskProgress,
    lastRequestId,
    loading,
    planningReadiness,
    planningInboxCount,
    reload,
  ]);
}
