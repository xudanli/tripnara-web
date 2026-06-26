import { useCallback, useEffect, useMemo, useState } from 'react';
import { planningWorkbenchApi, pickWorkbenchOptionComparison } from '@/api/planning-workbench';
import {
  buildDecisionStripCompareSummary,
  pickTopPersonaAlert,
  resolveDecisionStripPresentation,
  resolveDecisionStripPrimaryCta,
  resolveDecisionStripScore,
  shouldHidePlanningBannerForStrip,
  type DecisionStripCompareSummary,
  type DecisionStripPersonaLine,
  type DecisionStripPrimaryCta,
  type DecisionStripState,
} from '@/lib/decision-strip-model';
import {
  resolveDecisionStripLoopValidation,
  shouldEnhanceOrchestrationVerifyStep,
  type DecisionStripLoopValidationView,
} from '@/lib/decision-strip-loop-validation';
import { resolvePlanningBannerText } from '@/lib/world-model-guards';
import {
  pickComparisonFromRouteRun,
  pickOptimizeSuggestedOperation,
} from '@/lib/decision-strip-route-run';
import { useReadinessRepairLoop } from '@/hooks/useReadinessRepairLoop';
import { isTripLoopReadinessEnabled } from '@/lib/trip-loop-feature';
import { usePlanStudioCompareStore } from '@/store/planStudioCompareStore';
import { usePlanningTaskStore } from '@/store/planningTaskStore';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';
import { tripsApi } from '@/api/trips';
import type { PersonaAlert } from '@/types/trip';
import type { TripLoopUiView } from '@/types/trip-loop';

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
  /** Loop 验证步（ui.phase 驱动） */
  loopValidation: DecisionStripLoopValidationView | null;
  loopUi: TripLoopUiView | null;
  orchestrationRunning: boolean;
  reload: () => void;
  reloadLoopValidation: () => void;
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

export function useDecisionStripModel(tripId: string | null | undefined): DecisionStripModel {
  const worldModelGuards = useWorldModelGuardsStore((s) => s.worldModelGuards);
  const explainOptimization = useWorldModelGuardsStore((s) => s.explainOptimization);
  const lastRequestId = useWorldModelGuardsStore((s) => s.lastRequestId);
  const taskStatus = usePlanningTaskStore((s) => s.status);
  const taskMessage = usePlanningTaskStore((s) => s.message);
  const taskPhase = usePlanningTaskStore((s) => s.currentPhase);
  const taskProgress = usePlanningTaskStore((s) => s.progressPercentage);
  const taskResult = usePlanningTaskStore((s) => s.resultData);

  const loopEnabled = isTripLoopReadinessEnabled();
  const readinessLoop = useReadinessRepairLoop(tripId, {
    enabled: loopEnabled && Boolean(tripId),
    autoRestore: true,
  });

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

  useEffect(() => {
    if (!tripId) {
      setPersonaAlerts([]);
      setRemoteComparison(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const storeCmp = usePlanStudioCompareStore.getState().getComparison(tripId);
      const [alerts, comparison] = await Promise.all([
        tripsApi.getPersonaAlerts(tripId).catch(() => [] as PersonaAlert[]),
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
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, reloadToken]);

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
      void readinessLoop.restore();
    };
    window.addEventListener('plan-studio:comparison-updated', onComparisonUpdated);
    window.addEventListener('plan-studio:schedule-refresh', onScheduleRefresh);
    window.addEventListener('plan-studio:loop-readiness-changed', onLoopReadinessChanged);
    return () => {
      window.removeEventListener('plan-studio:comparison-updated', onComparisonUpdated);
      window.removeEventListener('plan-studio:schedule-refresh', onScheduleRefresh);
      window.removeEventListener('plan-studio:loop-readiness-changed', onLoopReadinessChanged);
    };
  }, [tripId, reload, readinessLoop.restore]);

  useEffect(() => {
    if (!tripId || !taskResult) return;
    const fromRouteRun = pickComparisonFromRouteRun(taskResult);
    if (fromRouteRun?.recommendation) {
      usePlanStudioCompareStore.getState().setComparison(tripId, fromRouteRun);
      setRemoteComparison(fromRouteRun);
    }
  }, [tripId, taskResult]);

  return useMemo(() => {
    const isRunning = taskStatus === 'PROCESSING';
    const isError = taskStatus === 'FAILED';

    const loopValidation = resolveDecisionStripLoopValidation({
      ui: readinessLoop.ui,
      loopRunning: readinessLoop.running,
      loopApplying: readinessLoop.applying,
    });

    const comparison = remoteComparison ?? cachedComparison;
    const compareSummary = buildDecisionStripCompareSummary(comparison);
    const personaLine = pickTopPersonaAlert(personaAlerts);
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
    });
    let score: number | null = scoreFromOptimization;

    if (isRunning) {
      state = 'running';
      headline = taskMessage?.trim() || '规划师正在处理…';
      subline = personaLine
        ? `${personaLine.personaLabel}：${personaLine.text}`
        : compareSummary?.reason ?? null;

      if (
        shouldEnhanceOrchestrationVerifyStep({ taskPhase, loopValidation }) &&
        loopValidation
      ) {
        subline = loopValidation.subline ?? loopValidation.headline;
      }

      primaryCta = { type: 'open_assistant' };
    } else if (isError) {
      state = 'error';
      headline = taskMessage?.trim() || '规划任务失败，请重试';
    } else if (!compareSummary && loopValidation?.active) {
      state = loopValidation.state;
      headline = loopValidation.headline;
      subline = loopValidation.subline;
      primaryCta = loopValidation.primaryCta;
    } else if (loopValidation?.active && loopValidation.phase === 'awaiting_approval') {
      primaryCta = loopValidation.primaryCta;
      if (!compareSummary) {
        state = loopValidation.state;
        headline = loopValidation.headline;
        subline = loopValidation.subline;
      }
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
      });
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
      personaAlerts,
      loopValidation,
      loopUi: readinessLoop.ui,
      orchestrationRunning: isRunning,
      reload,
      reloadLoopValidation: readinessLoop.restore,
    };
  }, [
    taskStatus,
    remoteComparison,
    cachedComparison,
    personaAlerts,
    explainOptimization,
    taskResult,
    worldModelGuards,
    taskMessage,
    taskPhase,
    taskProgress,
    lastRequestId,
    loading,
    readinessLoop.ui,
    readinessLoop.running,
    readinessLoop.applying,
    readinessLoop.restore,
  ]);
}
