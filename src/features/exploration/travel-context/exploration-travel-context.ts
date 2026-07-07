import type { TravelContextProvider } from '@/travel-context/client/travel-context-api.types';
import { submitIntentWithRetry } from '@/travel-context/hooks/submit-intent-with-retry';
import type { ExplorationViewData } from '@/travel-context/views/exploration-view.types';
import type {
  CandidatesBundle,
  EnsureFreshCandidatesAction,
  ExplorationScenarioDetail,
  PatchScenarioConditionsRequest,
  SubmitDecisionRequest,
  SubmitPrinciplesRequest,
  ApplyDecisionResponse,
  IssuesListResponse,
  FeasibilityCheckResult,
  ExplorationCheckJob,
} from '@/features/exploration/api/types';
import {
  isScenarioNotMaterialized,
  pollCheckJob,
  waitForCheckJob,
} from '@/features/exploration/api/client';
import type { DecisionsViewData, FeasibilityViewData, PlanViewData } from '@/travel-context/views/travel-context-views.types';
import {
  decisionsViewToIssuesList,
  feasibilityViewToCheckJob,
} from '@/travel-context/views/travel-context-views.types';
import { fetchCompareCandidates } from '@/features/exploration/api/client';
import {
  explorationViewToCandidatesBundle,
  explorationViewToScenarioDetail,
} from './exploration-view.adapter';
import { notifyExplorationTravelContextLocalWrite } from '../components/ExploreRevisionSyncNotifier';

async function submitExplorationIntent(
  provider: TravelContextProvider,
  intent: Parameters<typeof submitIntentWithRetry>[1],
) {
  notifyExplorationTravelContextLocalWrite();
  return submitIntentWithRetry(provider, intent);
}

async function readExplorationView(provider: TravelContextProvider): Promise<{
  contextId: string;
  data: ExplorationViewData;
}> {
  const envelope = await provider.getView<ExplorationViewData>('exploration');
  return { contextId: envelope.contextId, data: envelope.data };
}

async function enrichBundleDimensions(
  scenarioId: string,
  bundle: CandidatesBundle,
): Promise<CandidatesBundle> {
  if (bundle.dimensions?.length) return bundle;
  try {
    const compare = await fetchCompareCandidates(scenarioId);
    return {
      candidates: compare.candidates.length ? compare.candidates : bundle.candidates,
      generationVersion: compare.generationVersion ?? bundle.generationVersion,
      generationMode: compare.generationMode ?? bundle.generationMode,
      dimensions: compare.dimensions ?? bundle.dimensions,
    };
  } catch {
    return bundle;
  }
}

export async function loadExplorationScenarioDetail(
  provider: TravelContextProvider,
): Promise<ExplorationScenarioDetail> {
  const { contextId, data } = await readExplorationView(provider);
  return explorationViewToScenarioDetail(contextId, data);
}

export async function loadExplorationCompareData(
  provider: TravelContextProvider,
): Promise<{
  detail: ExplorationScenarioDetail;
  bundle: CandidatesBundle;
  action: EnsureFreshCandidatesAction;
}> {
  let { contextId, data } = await readExplorationView(provider);
  let detail = explorationViewToScenarioDetail(contextId, data);
  const status = detail.candidatesStatus?.status ?? 'EMPTY';

  if (status === 'EMPTY' || status === 'STALE') {
    await submitExplorationIntent(provider, {
      type: 'GENERATE_CANDIDATES',
      payload: status === 'STALE' ? { regenerate: true } : {},
    });
    ({ contextId, data } = await readExplorationView(provider));
    detail = explorationViewToScenarioDetail(contextId, data);
    let bundle = explorationViewToCandidatesBundle(data);
    bundle = await enrichBundleDimensions(contextId, bundle);
    return { detail, bundle, action: 'GENERATED' };
  }

  let bundle = explorationViewToCandidatesBundle(data);
  bundle = await enrichBundleDimensions(contextId, bundle);
  return { detail, bundle, action: 'FETCHED' };
}

export async function submitExplorationPrinciplesAndCandidates(
  provider: TravelContextProvider,
  body: SubmitPrinciplesRequest,
): Promise<ExplorationScenarioDetail> {
  await submitExplorationIntent(provider, {
    type: 'SET_PRINCIPLES',
    payload: body as unknown as Record<string, unknown>,
  });

  let { contextId, data } = await readExplorationView(provider);
  let detail = explorationViewToScenarioDetail(contextId, data);
  const needsGenerate =
    (detail.candidatesStatus?.status ?? 'EMPTY') === 'EMPTY' ||
    detail.candidatesStatus?.status === 'STALE';

  if (needsGenerate) {
    await submitExplorationIntent(provider, {
      type: 'GENERATE_CANDIDATES',
      payload: detail.candidatesStatus?.status === 'STALE' ? { regenerate: true } : {},
    });
    ({ contextId, data } = await readExplorationView(provider));
    detail = explorationViewToScenarioDetail(contextId, data);
  }

  return detail;
}

export async function regenerateExplorationCandidates(
  provider: TravelContextProvider,
): Promise<CandidatesBundle> {
  await submitExplorationIntent(provider, {
    type: 'GENERATE_CANDIDATES',
    payload: { regenerate: true },
  });
  const { contextId, data } = await readExplorationView(provider);
  let bundle = explorationViewToCandidatesBundle(data);
  bundle = await enrichBundleDimensions(contextId, bundle);
  return bundle;
}

export async function patchExplorationConditionsViaIntent(
  provider: TravelContextProvider,
  body: PatchScenarioConditionsRequest,
): Promise<ExplorationScenarioDetail> {
  await submitExplorationIntent(provider, {
    type: 'CHANGE_EXPLORATION_CONDITIONS',
    payload: body as unknown as Record<string, unknown>,
  });
  return loadExplorationScenarioDetail(provider);
}

export async function selectExplorationRouteViaIntent(
  provider: TravelContextProvider,
  payload: { routeId: string; selectionReason?: string },
): Promise<void> {
  await submitExplorationIntent(provider, {
    type: 'SELECT_ROUTE',
    payload,
  });
}

export async function loadExplorationPlanView(
  provider: TravelContextProvider,
): Promise<PlanViewData> {
  const envelope = await provider.getView<PlanViewData>('plan');
  return envelope.data;
}

export async function materializeExplorationViaIntent(
  provider: TravelContextProvider,
): Promise<void> {
  await submitExplorationIntent(provider, {
    type: 'MATERIALIZE_TRIP',
    payload: {},
  });
}

export async function loadExplorationDecisions(
  provider: TravelContextProvider,
): Promise<IssuesListResponse> {
  const envelope = await provider.getView<DecisionsViewData>('decisions');
  return decisionsViewToIssuesList(envelope.data);
}

async function readFeasibilityAfterCheck(
  provider: TravelContextProvider,
): Promise<{ job?: ExplorationCheckJob; issues: IssuesListResponse }> {
  const [feasibilityEnvelope, decisionsEnvelope] = await Promise.all([
    provider.getView<FeasibilityViewData>('feasibility'),
    provider.getView<DecisionsViewData>('decisions'),
  ]);
  const feasibility = feasibilityEnvelope.data;
  const decisions = decisionsViewToIssuesList(decisionsEnvelope.data);

  const issues =
    decisions.displayedIssues.length > 0
      ? decisions
      : feasibility.displayedIssues?.length
        ? {
            displayedIssues: feasibility.displayedIssues,
            totalIssueCount: feasibility.totalIssueCount ?? feasibility.displayedIssues.length,
          }
        : decisions;

  return {
    job: feasibilityViewToCheckJob(feasibility),
    issues,
  };
}

export async function runExplorationFeasibilityCheckViaIntent(
  provider: TravelContextProvider,
  asyncMode = false,
): Promise<{
  check: FeasibilityCheckResult;
  polled?: { job: ExplorationCheckJob; issues?: IssuesListResponse };
}> {
  const submitCheck = () =>
    submitExplorationIntent(provider, {
      type: 'RUN_FEASIBILITY_CHECK',
      payload: { async: asyncMode },
    });

  try {
    await submitCheck();
  } catch (err) {
    if (!isScenarioNotMaterialized(err)) throw err;
    await materializeExplorationViaIntent(provider);
    await submitCheck();
  }

  let { job, issues } = await readFeasibilityAfterCheck(provider);

  if (job?.status === 'PENDING' || job?.status === 'RUNNING') {
    const polled = await waitForCheckJob(job.jobId);
    await provider.refresh();
    const refreshed = await readFeasibilityAfterCheck(provider);
    return {
      check: {
        mode: 'async',
        jobId: job.jobId,
        status: polled.job.status,
      },
      polled: {
        job: polled.job,
        issues: polled.issues ?? refreshed.issues,
      },
    };
  }

  if (job?.jobId && !issues.displayedIssues.length) {
    try {
      const polled = await pollCheckJob(job.jobId);
      if (polled.issues) {
        issues = polled.issues;
      }
    } catch {
      // view 已是最新 SSOT
    }
  }

  return {
    check: {
      mode: 'sync',
      job: job ?? { jobId: '', status: 'COMPLETED' },
      issues,
    },
  };
}

export async function submitExplorationDecisionViaIntent(
  provider: TravelContextProvider,
  problemId: string,
  body: SubmitDecisionRequest,
): Promise<void> {
  await submitExplorationIntent(provider, {
    type: 'ACCEPT_DECISION_OPTION',
    payload: {
      problemId,
      ...body,
    } as unknown as Record<string, unknown>,
  });
}

export async function applyExplorationDecisionViaIntent(
  provider: TravelContextProvider,
  problemId: string,
): Promise<ApplyDecisionResponse> {
  await submitExplorationIntent(provider, {
    type: 'APPLY_DECISION',
    payload: { problemId },
  });

  const [decisionsEnvelope, feasibilityEnvelope] = await Promise.all([
    provider.getView<DecisionsViewData>('decisions'),
    provider.getView<FeasibilityViewData>('feasibility'),
  ]);
  const issues = decisionsViewToIssuesList(decisionsEnvelope.data);
  const feasibility = feasibilityEnvelope.data;

  return {
    originalProblem: {
      problemId,
      resolved: true,
      workflowStatus: 'RESOLVED',
    },
    revalidation: {
      status:
        feasibility.verdictStatus === 'EXECUTABLE' ||
        (issues.blockerIssueCount ?? 0) === 0
          ? 'PASSED'
          : 'FAILED',
    },
    issues,
  };
}
