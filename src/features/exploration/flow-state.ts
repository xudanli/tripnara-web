import type { ExplorationEntryVariant, MaterializationStatus } from './api/types';
import type { ResolvedPoi } from '@/features/poi-resolution/types';

const STORAGE_KEY = 'tripnara.exploration.flow';
const LEGACY_STORAGE_KEY = 'tripnara:exploration-flow';

export interface ExploreFlowState {
  scenarioId: string;
  sessionId: string;
  tripId?: string | null;
  assignedVariant?: ExplorationEntryVariant;
  researchProtocolId?: string;
  materializationStatus?: MaterializationStatus;
  selectedRouteId?: string;
  /** 路线方向页（Variant B）带入 Compare 页高亮的 routeId */
  compareFocusRouteId?: string;
  lastProblemId?: string;
  /** 最近一次 feasibility check 结论 */
  checkVerdict?: string;
  checkIssueCount?: number;
  checkBlockerCount?: number;
  checkOntologyIssueCount?: number;
  checkGatewayOpenCount?: number;
  checkUnresolvedPoiCount?: number;
  checkDiagnosis?: string;
  checkDurationMs?: number;
  /** Issues 页跳转 Compare 时待确认的 POI */
  pendingPoiConfirmation?: ResolvedPoi;
  poiConfirmReturnPath?: string;
  poiConfirmRouteId?: string;
  poiConfirmCountryCode?: string;
  poiConfirmLocale?: string;
}

function migrateLegacyStorage(): void {
  try {
    const legacy = sessionStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && !sessionStorage.getItem(STORAGE_KEY)) {
      sessionStorage.setItem(STORAGE_KEY, legacy);
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function persistFlowState(partial: Partial<ExploreFlowState>): ExploreFlowState {
  migrateLegacyStorage();
  const prev = readFlowState();
  const next: ExploreFlowState = { ...prev, ...partial } as ExploreFlowState;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function readFlowState(): Partial<ExploreFlowState> {
  migrateLegacyStorage();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ExploreFlowState;
  } catch {
    return {};
  }
}

export function readFlowStateForScenario(scenarioId: string): ExploreFlowState | null {
  const state = readFlowState();
  if (state.scenarioId !== scenarioId) return null;
  if (!state.scenarioId || !state.sessionId) return null;
  return state as ExploreFlowState;
}

export function clearFlowState(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_STORAGE_KEY);
}

/** 原则提交后进入 routes 入口（由 assignedVariant 再分流） */
export function routesEntryPath(scenarioId: string): string {
  return `/dashboard/explore/${scenarioId}/routes`;
}

export function explorePath(
  scenarioId: string,
  ...segments: string[]
): string {
  return `/dashboard/explore/${scenarioId}/${segments.join('/')}`;
}
