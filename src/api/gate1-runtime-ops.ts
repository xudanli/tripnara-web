/**
 * Gate 1 · Decision Runtime 运维接口
 * 前缀 /ops/runtime，需 Gate1OpsAccessGuard
 */

import { gate1Get } from './gate1-common';
import type {
  Gate1RuntimeAcceptanceReport,
  Gate1RuntimeFlags,
  Gate1RuntimeMetrics,
  Gate1RuntimeProjectionView,
  Gate1RuntimeReconcileResult,
} from '@/types/gate1';
import type {
  DecisionDnaRecentAuditsResponse,
  DecisionOsContingencyRecentResponse,
  DecisionOsContextRecallBaseline,
  DecisionOsMemoryStateRecentResponse,
  DecisionOsSloSnapshot,
} from '@/types/decision-os';

const BASE = '/ops/runtime';

export const gate1RuntimeOpsApi = {
  /** GET /ops/runtime/flags */
  getFlags: (): Promise<Gate1RuntimeFlags> => gate1Get<Gate1RuntimeFlags>(`${BASE}/flags`),

  /** GET /ops/runtime/acceptance */
  getAcceptance: (): Promise<Gate1RuntimeAcceptanceReport> =>
    gate1Get<Gate1RuntimeAcceptanceReport>(`${BASE}/acceptance`),

  /** GET /ops/runtime/metrics?reconcile=true */
  getMetrics: (reconcile?: boolean): Promise<Gate1RuntimeMetrics> =>
    gate1Get<Gate1RuntimeMetrics>(
      `${BASE}/metrics`,
      reconcile ? { reconcile: 'true' } : undefined,
    ),

  /** GET /ops/runtime/projects/:projectId/reconcile */
  reconcileProject: (projectId: string): Promise<Gate1RuntimeReconcileResult> =>
    gate1Get<Gate1RuntimeReconcileResult>(
      `${BASE}/projects/${encodeURIComponent(projectId)}/reconcile`,
    ),

  /** GET /ops/runtime/projects/:projectId/projection */
  getProjectProjection: (projectId: string): Promise<Gate1RuntimeProjectionView> =>
    gate1Get<Gate1RuntimeProjectionView>(
      `${BASE}/projects/${encodeURIComponent(projectId)}/projection`,
    ),

  /** GET /ops/runtime/slo */
  getSlo: (): Promise<DecisionOsSloSnapshot> =>
    gate1Get<DecisionOsSloSnapshot>(`${BASE}/slo`),

  /** GET /ops/runtime/slo/contingency/recent */
  getSloContingencyRecent: (limit = 20): Promise<DecisionOsContingencyRecentResponse> =>
    gate1Get<DecisionOsContingencyRecentResponse>(`${BASE}/slo/contingency/recent`, { limit }),

  /** GET /ops/runtime/slo/decision-dna/recent */
  getSloDecisionDnaRecent: (limit = 20): Promise<DecisionDnaRecentAuditsResponse> =>
    gate1Get<DecisionDnaRecentAuditsResponse>(`${BASE}/slo/decision-dna/recent`, { limit }),

  /** GET /ops/runtime/slo/context-recall/baseline */
  getSloContextRecallBaseline: (): Promise<DecisionOsContextRecallBaseline> =>
    gate1Get<DecisionOsContextRecallBaseline>(`${BASE}/slo/context-recall/baseline`),

  /** GET /ops/runtime/slo/memory-state/recent */
  getSloMemoryStateRecent: (limit = 20): Promise<DecisionOsMemoryStateRecentResponse> =>
    gate1Get<DecisionOsMemoryStateRecentResponse>(`${BASE}/slo/memory-state/recent`, { limit }),
};
