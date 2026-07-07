import type { NavigateFunction } from 'react-router-dom';
import type { TravelContextProvider } from '@/travel-context/client/travel-context-api.types';
import type { ExplorationCheckJob } from '../api/types';
import {
  ensureRouteSelection,
  isExplorationUnavailable,
  resolveIssuesAfterCheck,
  runFeasibilityCheckWithRecovery,
  trackExplorationEvent,
} from '../api/client';
import { mapIssuesResponse, MOCK_BLOCK_ISSUE } from '../api/adapters';
import {
  hasExplorationBlockingIssues,
  resolveBlockerIssueCount,
} from '../api/helpers';
import { persistFlowState, type ExploreFlowState } from '../flow-state';
import { shouldOfferRepairFlow } from './check-verdict.util';
import { runExplorationFeasibilityCheckViaIntent } from '../travel-context/exploration-travel-context';

export async function runExplorationCheckFlow(options: {
  scenarioId: string;
  apiRouteId: string;
  base: string;
  navigate: NavigateFunction;
  flow: Partial<ExploreFlowState>;
  replace?: boolean;
  travelContextProvider?: TravelContextProvider | null;
}): Promise<void> {
  const {
    scenarioId,
    apiRouteId,
    base,
    navigate,
    flow,
    replace = false,
    travelContextProvider,
  } = options;

  const goToDecision = (
    issueId: string,
    verdict?: string,
    issueCount?: number,
    durationMs?: number,
    extras?: Pick<
      ExploreFlowState,
      | 'checkBlockerCount'
      | 'checkOntologyIssueCount'
      | 'checkGatewayOpenCount'
      | 'checkUnresolvedPoiCount'
      | 'checkDiagnosis'
    >,
  ) => {
    persistFlowState({
      selectedRouteId: apiRouteId,
      lastProblemId: issueId,
      checkVerdict: verdict,
      checkIssueCount: issueCount,
      checkDurationMs: durationMs,
      ...extras,
    });
    navigate(`${base}/decisions/${encodeURIComponent(issueId)}`, { replace });
  };

  const persistCheckCounts = (
    job: ExplorationCheckJob | undefined,
    mapped: ReturnType<typeof mapIssuesResponse>,
  ) => ({
    checkBlockerCount: resolveBlockerIssueCount(mapped, job?.result),
    checkOntologyIssueCount:
      job?.result?.ontologyIssueCount ?? mapped.ontologyIssueCount,
    checkGatewayOpenCount: job?.result?.gatewayOpenCount ?? mapped.gatewayIssueCount,
    checkUnresolvedPoiCount:
      job?.result?.unresolvedPoiCount ?? mapped.unresolvedPoiIssueCount,
    checkDiagnosis: job?.result?.diagnosis,
  });

  const shouldNavigateToDecision = (
    mapped: ReturnType<typeof mapIssuesResponse>,
    job: ExplorationCheckJob | undefined,
    verdict: string | undefined,
    primary: ReturnType<typeof mapIssuesResponse>['displayedIssues'][0] | undefined,
  ) => {
    if (!primary?.issueId) return false;
    if (hasExplorationBlockingIssues(mapped, job?.result)) return true;
    return shouldOfferRepairFlow(verdict, primary);
  };

  try {
    if (travelContextProvider) {
      // SELECT_ROUTE 已在详情页提交；此处直接走 Intent check
      const { check, polled } = await runExplorationFeasibilityCheckViaIntent(
        travelContextProvider,
        false,
      );
      const job = check.mode === 'async' ? polled?.job : check.job;

      if (job?.status === 'FAILED') {
        throw new Error(job.error ?? '可靠性检查失败');
      }

      const verdict = job?.result?.verdictStatus;
      const issueCount = job?.result?.totalIssueCount;
      const durationMs = job?.result?.checkDurationMs;
      if (job?.tripId) {
        persistFlowState({ tripId: job.tripId });
      }

      if (flow.sessionId) {
        void trackExplorationEvent(flow.sessionId, 'feasibility_check_completed', {
          scenarioId,
          protocolId: flow.researchProtocolId,
          entryVariant: flow.assignedVariant,
          tripId: job?.tripId ?? flow.tripId,
          routeId: apiRouteId,
          currentStep: 'risk_check',
        });
      }

      const issues =
        check.mode === 'sync'
          ? check.issues
          : (polled?.issues ?? (await resolveIssuesAfterCheck(scenarioId, check, polled)));
      const mapped = mapIssuesResponse(issues);
      const primary = mapped.displayedIssues[0];
      const counts = persistCheckCounts(job, mapped);

      if (shouldNavigateToDecision(mapped, job, verdict, primary)) {
        if (flow.sessionId) {
          void trackExplorationEvent(flow.sessionId, 'consumer_issue_viewed', {
            scenarioId,
            protocolId: flow.researchProtocolId,
            entryVariant: flow.assignedVariant,
            tripId: job?.tripId ?? flow.tripId,
            routeId: apiRouteId,
            currentStep: 'decision',
          });
        }
        goToDecision(
          primary!.issueId,
          verdict,
          mapped.totalIssueCount ?? issueCount,
          durationMs,
          counts,
        );
        return;
      }

      persistFlowState({
        selectedRouteId: apiRouteId,
        checkVerdict: verdict,
        checkIssueCount: 0,
        checkBlockerCount: 0,
      });
      navigate(`${base}/continue`, { replace });
      return;
    }

    await ensureRouteSelection(scenarioId, apiRouteId);

    const { check, polled } = await runFeasibilityCheckWithRecovery(scenarioId, false);
    const job = check.mode === 'async' ? polled?.job : check.job;

    if (job?.status === 'FAILED') {
      throw new Error(job.error ?? '可靠性检查失败');
    }

    const verdict = job?.result?.verdictStatus;
    const issueCount = job?.result?.totalIssueCount;
    const durationMs = job?.result?.checkDurationMs;
    if (job?.tripId) {
      persistFlowState({ tripId: job.tripId });
    }

    if (flow.sessionId) {
      void trackExplorationEvent(flow.sessionId, 'feasibility_check_completed', {
        scenarioId,
        protocolId: flow.researchProtocolId,
        entryVariant: flow.assignedVariant,
        tripId: job?.tripId ?? flow.tripId,
        routeId: apiRouteId,
        currentStep: 'risk_check',
      });
    }

    const issues = await resolveIssuesAfterCheck(scenarioId, check, polled);
    const mapped = mapIssuesResponse(issues);
    const primary = mapped.displayedIssues[0];
    const counts = persistCheckCounts(job, mapped);

    if (shouldNavigateToDecision(mapped, job, verdict, primary)) {
      if (flow.sessionId) {
        void trackExplorationEvent(flow.sessionId, 'consumer_issue_viewed', {
          scenarioId,
          protocolId: flow.researchProtocolId,
          entryVariant: flow.assignedVariant,
          tripId: job?.tripId ?? flow.tripId,
          routeId: apiRouteId,
          currentStep: 'decision',
        });
      }
      goToDecision(
        primary!.issueId,
        verdict,
        mapped.totalIssueCount ?? issueCount,
        durationMs,
        counts,
      );
      return;
    }

    persistFlowState({
      selectedRouteId: apiRouteId,
      checkVerdict: verdict,
      checkIssueCount: 0,
      checkBlockerCount: 0,
    });
    navigate(`${base}/continue`, { replace });
  } catch (err) {
    if (isExplorationUnavailable(err)) {
      goToDecision(MOCK_BLOCK_ISSUE.issueId, 'NOT_EXECUTABLE', 2);
      return;
    }
    throw err;
  }
}
