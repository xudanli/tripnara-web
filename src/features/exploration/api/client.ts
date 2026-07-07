/**
 * Exploration Consumer API client — Base: /api/exploration
 */

import apiClient from '@/api/client';
import { CONFIG } from '@/constants/config';
import {
  resolveCompareDimensionsFromPayload,
} from '../lib/compare-dimensions.util';
import type {
  ApplyDecisionResponse,
  CandidatesBundle,
  ConsumerRepairOption,
  ContinueFeedbackRequest,
  ContinuePackagesResponse,
  CreateExplorationScenarioRequest,
  EnsureFreshCandidatesAction,
  ExplorationScenarioDetail,
  ExplorationScenarioSummary,
  FeasibilityCheckResult,
  GenerateCandidatesOptions,
  IssuesListResponse,
  PatchScenarioConditionsRequest,
  PatchScenarioConditionsResponse,
  PrincipleCatalogItem,
  PrinciplesSummaryRequest,
  PrinciplesSummaryView,
  ResearchEvent,
  RouteCandidateView,
  RouteDetailResponse,
  RouteSelectionRequest,
  SavePrinciplesResponse,
  SubmitCommitmentRequest,
  SubmitDecisionRequest,
  SubmitPrinciplesRequest,
  SubmitPriceLockRequest,
  ResearchPaymentCatalogResponse,
  StartDepositResponse,
  ExplorationCheckJob,
  ConditionsCatalogResponse,
} from './types';

const BASE = '/exploration';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiWrapper<T> = SuccessResponse<T> | ErrorResponse;

function unwrap<T>(response: { data: ApiWrapper<T> }): T {
  if (!response?.data?.success) {
    const err = response?.data && 'error' in response.data ? response.data.error : undefined;
    const message = err?.message || err?.code || '请求失败';
    const error = new Error(message) as Error & { code?: string };
    error.code = err?.code;
    throw error;
  }
  return response.data.data;
}

import axios from 'axios';
import { resolveHttpErrorUserMessage } from '@/types/http-error';

export function isExplorationUnavailable(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    return status === 404 || status === 501 || status === 503;
  }
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501 || status === 503;
}

/** 409 — Scenario 已完成/废弃，原则预览不可用 */
export function isScenarioLocked(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (err.response?.status !== 409) return false;
  const body = err.response.data;
  const code =
    (body as { error?: { code?: string } })?.error?.code ??
    (body as { code?: string })?.code;
  return code === 'SCENARIO_LOCKED';
}

/** 503 — 原则总结 feature 未开或 LLM 不可用 */
export function isPrinciplesSummaryUnavailable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (err.response?.status !== 503) return false;
  const body = err.response.data;
  const code =
    (body as { error?: { code?: string } })?.error?.code ??
    (body as { code?: string })?.code;
  return code === 'SUMMARY_UNAVAILABLE' || code == null;
}

/** 409 — Scenario 尚未物化为 Trip（需先完成 principles 或显式 materialize） */
export function isScenarioNotMaterialized(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (err.response?.status !== 409) return false;
  const body = err.response.data;
  const code =
    (body as { error?: { code?: string } })?.error?.code ??
    (body as { code?: string })?.code;
  if (code === 'SCENARIO_NOT_MATERIALIZED') return true;
  const msg = resolveHttpErrorUserMessage(body) ?? '';
  return /SCENARIO_NOT_MATERIALIZED|not materialized|未物化/i.test(msg);
}

/** 409 — 已选路，禁止 regenerate / PATCH conditions */
export function isRouteAlreadySelected(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (err.response?.status !== 409) return false;
  const body = err.response.data;
  const code =
    (body as { error?: { code?: string } })?.error?.code ??
    (body as { code?: string })?.code;
  if (code === 'ROUTE_ALREADY_SELECTED') return true;
  const msg = resolveHttpErrorUserMessage(body) ?? '';
  return /ROUTE_ALREADY_SELECTED|already selected|已选路/i.test(msg);
}

export async function ensureRouteSelection(
  scenarioId: string,
  routeId: string,
): Promise<void> {
  try {
    await submitRouteSelection(scenarioId, {
      routeId,
      selectionReason: 'confirmed',
    });
  } catch (err) {
    if (isExplorationUnavailable(err)) return;
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      const msg = resolveHttpErrorUserMessage(err.response.data) ?? '';
      if (/not found for scenario/i.test(msg)) throw err;
      return;
    }
    throw err;
  }
}

export const ICELAND_RESEARCH_PROTOCOL_ID = 'iceland-discovery-v1';

export const DEFAULT_ICELAND_SCENARIO_REQUEST: CreateExplorationScenarioRequest = {
  researchProtocolId: ICELAND_RESEARCH_PROTOCOL_ID,
  destinationCodes: ['IS'],
  dateRange: { startDate: '2026-09-10', endDate: '2026-09-18' },
  travelers: [{ type: 'ADULT' }, { type: 'ADULT' }],
  budget: { currency: 'USD', min: 3000, max: 4000 },
  mobilityContext: { vehicleType: '2WD_COMPACT_SUV' },
  insuranceContext: { coverageTier: 'STANDARD' },
  rentalContext: {
    pickupLocation: 'KEF',
    pickupTimeLocal: '10:00',
    afterHoursPickupConfirmed: false,
  },
};

export async function createExplorationScenario(
  body: CreateExplorationScenarioRequest,
): Promise<ExplorationScenarioSummary> {
  const response = await apiClient.post<ApiWrapper<ExplorationScenarioSummary>>(
    `${BASE}/scenarios`,
    body,
  );
  return unwrap(response);
}

/**
 * Hub ① 创建 Scenario
 * - Consumer：传 destination/date/travelers/budget/mobility，**不传** researchProtocolId
 * - Research：仅传 `{ researchProtocolId: 'iceland-discovery-v1' }`
 */
export async function startExplorationFromHub(
  body?: CreateExplorationScenarioRequest,
): Promise<ExplorationScenarioSummary> {
  if (!body) {
    return createExplorationScenario(DEFAULT_ICELAND_SCENARIO_REQUEST);
  }
  if (
    body.researchProtocolId &&
    !body.destinationCodes &&
    !body.dateRange &&
    !body.travelers &&
    !body.budget &&
    !body.mobilityContext &&
    !body.insuranceContext &&
    !body.rentalContext
  ) {
    return createExplorationScenario({ researchProtocolId: body.researchProtocolId });
  }
  const payload: CreateExplorationScenarioRequest = { ...body };
  delete payload.researchProtocolId;
  return createExplorationScenario(payload);
}

export async function fetchConditionsCatalog(
  destinationCode = 'IS',
): Promise<ConditionsCatalogResponse> {
  const response = await apiClient.get<ApiWrapper<ConditionsCatalogResponse>>(
    `${BASE}/conditions/catalog`,
    { params: { destinationCode } },
  );
  return unwrap(response);
}

export async function fetchScenarioDetail(scenarioId: string): Promise<ExplorationScenarioDetail> {
  const response = await apiClient.get<ApiWrapper<ExplorationScenarioDetail>>(
    `${BASE}/scenarios/${scenarioId}`,
  );
  return unwrap(response);
}

export async function materializeScenario(scenarioId: string): Promise<ExplorationScenarioSummary> {
  const response = await apiClient.post<ApiWrapper<ExplorationScenarioSummary>>(
    `${BASE}/scenarios/${scenarioId}/materialize`,
  );
  return unwrap(response);
}

export async function fetchPrinciplesCatalog(): Promise<PrincipleCatalogItem[]> {
  const response = await apiClient.get<ApiWrapper<{ items: PrincipleCatalogItem[] } | PrincipleCatalogItem[]>>(
    `${BASE}/principles/catalog`,
  );
  const data = unwrap(response);
  return Array.isArray(data) ? data : data.items ?? [];
}

export async function submitPrinciples(
  scenarioId: string,
  body: SubmitPrinciplesRequest,
): Promise<SavePrinciplesResponse> {
  const response = await apiClient.put<ApiWrapper<SavePrinciplesResponse>>(
    `${BASE}/scenarios/${scenarioId}/principles`,
    body,
  );
  return unwrap(response);
}

/** 别名 — 对齐 frontend-routes-scaffold / EXPLORATION_API */
export const savePrinciples = submitPrinciples;

export async function previewPrinciplesSummary(
  scenarioId: string,
  body: PrinciplesSummaryRequest,
  signal?: AbortSignal,
): Promise<PrinciplesSummaryView> {
  const response = await apiClient.post<ApiWrapper<PrinciplesSummaryView>>(
    `${BASE}/scenarios/${scenarioId}/principles/summary`,
    body,
    { signal },
  );
  return unwrap(response);
}

/** @deprecated 使用 previewPrinciplesSummary */
export const fetchPrinciplesSummary = previewPrinciplesSummary;

export async function patchScenarioConditions(
  scenarioId: string,
  body: PatchScenarioConditionsRequest,
): Promise<PatchScenarioConditionsResponse> {
  const response = await apiClient.patch<ApiWrapper<PatchScenarioConditionsResponse>>(
    `${BASE}/scenarios/${scenarioId}/conditions`,
    body,
  );
  return unwrap(response);
}

function normalizeCandidatesBundle(
  data:
    | CandidatesBundle
    | RouteCandidateView[]
    | { candidates?: RouteCandidateView[]; generationVersion?: number; generationMode?: CandidatesBundle['generationMode']; dimensions?: unknown },
): CandidatesBundle {
  if (Array.isArray(data)) {
    return { candidates: data, generationVersion: 1 };
  }
  const candidates = data.candidates ?? [];
  const dimensions = resolveCompareDimensionsFromPayload(data, candidates);
  return {
    candidates,
    generationVersion: data.generationVersion ?? 1,
    generationMode: data.generationMode,
    dimensions: dimensions.length ? dimensions : undefined,
  };
}

export async function generateCandidates(
  scenarioId: string,
  options: GenerateCandidatesOptions = {},
): Promise<CandidatesBundle> {
  const response = await apiClient.post<
    ApiWrapper<CandidatesBundle | RouteCandidateView[] | { candidates: RouteCandidateView[] }>
  >(`${BASE}/scenarios/${scenarioId}/candidates`, {
    force: options.force,
    idempotencyKey: options.idempotencyKey,
  });
  const data = unwrap(response);
  return normalizeCandidatesBundle(data);
}

export async function regenerateCandidates(scenarioId: string): Promise<CandidatesBundle> {
  const response = await apiClient.post<
    ApiWrapper<CandidatesBundle | { candidates: RouteCandidateView[] }>
  >(`${BASE}/scenarios/${scenarioId}/candidates/regenerate`, {});
  const data = unwrap(response);
  const bundle = normalizeCandidatesBundle(data);
  return enrichBundleWithCompare(scenarioId, bundle);
}

export async function fetchCompareCandidates(scenarioId: string): Promise<CandidatesBundle> {
  const response = await apiClient.get<
    ApiWrapper<Record<string, unknown>>
  >(`${BASE}/scenarios/${scenarioId}/candidates/compare`);
  const data = unwrap(response);
  const candidates = (data.candidates as RouteCandidateView[] | undefined) ?? [];
  const dimensions = resolveCompareDimensionsFromPayload(data, candidates);

  if (import.meta.env.DEV && !dimensions.length) {
    console.warn('[explore/compare] compare payload has no dimensions', {
      keys: Object.keys(data),
      candidateCount: candidates.length,
      hasCandidateCompare: candidates.some((c) => c.compare != null),
    });
  }

  return {
    candidates,
    generationVersion: (data.generationVersion as number | undefined) ?? 0,
    generationMode: data.generationMode as CandidatesBundle['generationMode'],
    dimensions: dimensions.length ? dimensions : undefined,
  };
}

/** generate/regenerate 可能不含 dimensions，补拉 compare 接口 */
async function enrichBundleWithCompare(
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

/** @deprecated 使用 fetchCompareCandidates */
export const fetchCandidatesCompare = fetchCompareCandidates;

/** 对比页入口 — EMPTY 时生成，READY/STALE/SELECTED 时拉取 compare */
export async function ensureFreshCandidates(
  scenarioId: string,
  detail?: ExplorationScenarioDetail,
): Promise<CandidatesBundle & { action: EnsureFreshCandidatesAction }> {
  const scenario = detail ?? (await fetchScenarioDetail(scenarioId));
  const status = scenario.candidatesStatus?.status ?? 'EMPTY';

  if (status === 'EMPTY') {
    const generated = await generateCandidates(scenarioId);
    const bundle = await enrichBundleWithCompare(scenarioId, generated);
    return { ...bundle, action: 'GENERATED' };
  }

  if (status === 'STALE') {
    const bundle = await regenerateCandidates(scenarioId);
    return { ...bundle, action: 'GENERATED' };
  }

  try {
    const bundle = await fetchCompareCandidates(scenarioId);
    return { ...bundle, action: 'FETCHED' };
  } catch (err) {
    if (isExplorationUnavailable(err)) throw err;
    const generated = await generateCandidates(scenarioId);
    const bundle = await enrichBundleWithCompare(scenarioId, generated);
    return { ...bundle, action: 'GENERATED' };
  }
}

/**
 * 路线详情 — 支持 routeId（route_remote-highlands-south）或 strategyId（remote-highlands-south）
 * GET /exploration/scenarios/:scenarioId/routes/:routeId
 */
export async function fetchRouteDetail(
  scenarioId: string,
  routeIdOrStrategyId: string,
): Promise<RouteDetailResponse> {
  const response = await apiClient.get<ApiWrapper<RouteDetailResponse>>(
    `${BASE}/scenarios/${scenarioId}/routes/${encodeURIComponent(routeIdOrStrategyId)}`,
  );
  return unwrap(response);
}

export async function submitRouteSelection(
  scenarioId: string,
  body: RouteSelectionRequest,
): Promise<unknown> {
  const response = await apiClient.post<ApiWrapper<unknown>>(
    `${BASE}/scenarios/${scenarioId}/selections`,
    body,
  );
  return unwrap(response);
}

export async function runFeasibilityCheck(
  scenarioId: string,
  asyncMode = false,
): Promise<FeasibilityCheckResult> {
  const response = await apiClient.post<
    ApiWrapper<
      | { job: ExplorationCheckJob; issues: IssuesListResponse }
      | { jobId: string; status: string; job?: ExplorationCheckJob; issues?: IssuesListResponse }
    >
  >(`${BASE}/scenarios/${scenarioId}/check`, asyncMode ? { async: true } : {}, {
    validateStatus: (s) => s === 200 || s === 202,
  });

  const data = unwrap(response);
  if ('jobId' in data && data.jobId && !data.issues) {
    return {
      mode: 'async',
      jobId: data.jobId,
      status: (data.status as ExplorationCheckJob['status']) ?? 'PENDING',
    };
  }
  const job: ExplorationCheckJob =
    'job' in data && data.job
      ? data.job
      : {
          jobId: 'jobId' in data && data.jobId ? data.jobId : '',
          status: ('status' in data ? data.status : 'COMPLETED') as ExplorationCheckJob['status'],
        };
  const issues = 'issues' in data && data.issues ? data.issues : { displayedIssues: [], totalIssueCount: 0 };
  return { mode: 'sync', job, issues };
}

export async function pollCheckJob(jobId: string): Promise<{
  job: ExplorationCheckJob;
  issues?: IssuesListResponse;
}> {
  const response = await apiClient.get<
    ApiWrapper<{ job: ExplorationCheckJob; issues?: IssuesListResponse }>
  >(`${BASE}/check-jobs/${jobId}`);
  return unwrap(response);
}

export async function waitForCheckJob(
  jobId: string,
  options?: { intervalMs?: number; maxAttempts?: number },
): Promise<{ job: ExplorationCheckJob; issues?: IssuesListResponse }> {
  const intervalMs = options?.intervalMs ?? 1500;
  const maxAttempts = options?.maxAttempts ?? 120;

  for (let i = 0; i < maxAttempts; i += 1) {
    const result = await pollCheckJob(jobId);
    if (result.job.status === 'COMPLETED' || result.job.status === 'FAILED') {
      return result;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('检查超时，请稍后重试');
}

/** 优先使用 check / poll 响应内嵌的 issues，避免多余 GET 失败 */
export async function resolveIssuesAfterCheck(
  scenarioId: string,
  check: FeasibilityCheckResult,
  polled?: { issues?: IssuesListResponse },
): Promise<IssuesListResponse> {
  if (check.mode === 'sync' && check.issues) {
    return check.issues;
  }
  if (polled?.issues) {
    return polled.issues;
  }
  return fetchIssues(scenarioId);
}

export async function runFeasibilityCheckWithRecovery(
  scenarioId: string,
  asyncMode = false,
): Promise<{
  check: FeasibilityCheckResult;
  polled?: { job: ExplorationCheckJob; issues?: IssuesListResponse };
}> {
  try {
    const check = await runFeasibilityCheck(scenarioId, asyncMode);
    if (check.mode === 'async') {
      return { check, polled: await waitForCheckJob(check.jobId) };
    }
    return { check };
  } catch (err) {
    if (!isScenarioNotMaterialized(err)) throw err;
    await materializeScenario(scenarioId);
    const check = await runFeasibilityCheck(scenarioId, asyncMode);
    if (check.mode === 'async') {
      return { check, polled: await waitForCheckJob(check.jobId) };
    }
    return { check };
  }
}

export async function fetchIssues(scenarioId: string): Promise<IssuesListResponse> {
  const response = await apiClient.get<ApiWrapper<IssuesListResponse>>(
    `${BASE}/scenarios/${scenarioId}/issues`,
  );
  return unwrap(response);
}

export async function fetchRepairOptions(
  scenarioId: string,
  issueId: string,
): Promise<ConsumerRepairOption[]> {
  const response = await apiClient.get<
    ApiWrapper<{ options: ConsumerRepairOption[] } | ConsumerRepairOption[]>
  >(`${BASE}/scenarios/${scenarioId}/issues/${issueId}/options`);
  const data = unwrap(response);
  return Array.isArray(data) ? data : data.options ?? [];
}

export async function submitDecision(
  scenarioId: string,
  problemId: string,
  body: SubmitDecisionRequest,
): Promise<unknown> {
  const response = await apiClient.post<ApiWrapper<unknown>>(
    `${BASE}/scenarios/${scenarioId}/decisions/${problemId}/submit`,
    body,
  );
  return unwrap(response);
}

export async function applyDecision(
  scenarioId: string,
  problemId: string,
): Promise<ApplyDecisionResponse> {
  const response = await apiClient.post<ApiWrapper<ApplyDecisionResponse>>(
    `${BASE}/scenarios/${scenarioId}/decisions/${problemId}/apply`,
  );
  return unwrap(response);
}

export async function revalidateScenario(scenarioId: string): Promise<ApplyDecisionResponse> {
  const response = await apiClient.post<ApiWrapper<ApplyDecisionResponse>>(
    `${BASE}/scenarios/${scenarioId}/revalidate`,
  );
  return unwrap(response);
}

export async function fetchContinuePackages(scenarioId: string): Promise<ContinuePackagesResponse> {
  const response = await apiClient.get<ApiWrapper<ContinuePackagesResponse>>(
    `${BASE}/scenarios/${scenarioId}/continue/packages`,
  );
  return unwrap(response);
}

export async function submitContinueFeedback(
  scenarioId: string,
  body: ContinueFeedbackRequest,
): Promise<unknown> {
  const response = await apiClient.post<ApiWrapper<unknown>>(
    `${BASE}/scenarios/${scenarioId}/continue/feedback`,
    body,
  );
  return unwrap(response);
}

export async function submitResearchCommitment(
  sessionId: string,
  body: SubmitCommitmentRequest,
): Promise<unknown> {
  const response = await apiClient.post<ApiWrapper<unknown>>(
    `/research/sessions/${sessionId}/commitments`,
    body,
  );
  return unwrap(response);
}

export async function fetchPaymentCatalog(): Promise<ResearchPaymentCatalogResponse> {
  const response = await apiClient.get<ApiWrapper<ResearchPaymentCatalogResponse>>(
    '/research/payments/catalog',
  );
  return unwrap(response);
}

export async function startResearchDeposit(sessionId: string): Promise<StartDepositResponse> {
  const response = await apiClient.post<ApiWrapper<StartDepositResponse>>(
    `/research/sessions/${sessionId}/payments/deposit/start`,
  );
  return unwrap(response);
}

export async function confirmResearchDeposit(sessionId: string): Promise<unknown> {
  const response = await apiClient.post<ApiWrapper<unknown>>(
    `/research/sessions/${sessionId}/payments/deposit/confirm`,
  );
  return unwrap(response);
}

export async function refundResearchDeposit(sessionId: string): Promise<unknown> {
  const response = await apiClient.post<ApiWrapper<unknown>>(
    `/research/sessions/${sessionId}/payments/deposit/refund`,
  );
  return unwrap(response);
}

export async function submitPriceLock(
  sessionId: string,
  body: SubmitPriceLockRequest,
): Promise<unknown> {
  const response = await apiClient.post<ApiWrapper<unknown>>(
    `/research/sessions/${sessionId}/price-lock`,
    body,
  );
  return unwrap(response);
}

export async function batchResearchEvents(
  sessionId: string,
  events: ResearchEvent[],
): Promise<void> {
  await apiClient.post(`/research/sessions/${sessionId}/events/batch`, { events });
}

/** @deprecated 鉴权由 apiClient 拦截器注入，保留签名兼容集成指南示例 */
export async function startExplorationFromHubWithToken(
  _token: string,
  body?: Partial<CreateExplorationScenarioRequest>,
): Promise<ExplorationScenarioSummary> {
  return startExplorationFromHub(body);
}

export const CHECK_LOADING_STAGES = [
  '正在核对路线结构',
  '正在检查目的地规则',
  '正在确认车辆和道路条件',
  '正在生成可选修复方案',
] as const;

export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION ?? 'web';
}

export function buildResearchEvent(
  eventName: string,
  payload: ResearchEvent['payload'],
): ResearchEvent {
  return {
    eventName,
    payload: {
      ...payload,
      timestamp: payload.timestamp ?? new Date().toISOString(),
      appVersion: payload.appVersion ?? getAppVersion(),
    },
  };
}

export async function trackExplorationEvent(
  sessionId: string,
  eventName: string,
  payload: Omit<ResearchEvent['payload'], 'timestamp' | 'sessionId' | 'appVersion'>,
): Promise<void> {
  try {
    await batchResearchEvents(sessionId, [
      buildResearchEvent(eventName, {
        ...payload,
        sessionId,
        timestamp: new Date().toISOString(),
        appVersion: getAppVersion(),
      } as ResearchEvent['payload']),
    ]);
  } catch (e) {
    console.warn('[exploration] track event failed', eventName, e);
  }
}

export { CONFIG };
