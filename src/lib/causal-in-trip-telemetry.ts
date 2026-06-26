/**
 * 行中 telemetry → OPS outcome / causal-outcome 自动闭环（fail-open）
 */

import { decisionEngineApi } from '@/api/decision-engine';
import {
  buildCausalObservationFromEnvironmentEvent,
  buildCausalObservationFromInTripLoopUi,
  buildOpsOutcomeFromEnvironmentEvent,
  buildOpsOutcomeFromInTripLoopUi,
} from '@/lib/causal-in-trip-telemetry-builders';
import { parseCausalObservation } from '@/lib/causal-observation.util';
import {
  buildCausalOutcomeContext,
  loadCausalRuntimeSession,
  updateCausalRuntimeEcho,
} from '@/lib/causal-runtime-session';
import type {
  CausalCounterfactualReport,
  CausalObservationV1,
} from '@/types/causal-travel-runtime';
import type { OpsRealityOutcomePayloadV1 } from '@/types/decision-engine';
import type { EnvironmentEventDetail } from '@/types/in-trip-execution';
import type { InTripLoopUiView } from '@/types/trip-loop';

export type InTripCausalTelemetryPath =
  | 'ops_outcome'
  | 'causal_outcome'
  | 'skipped'
  | 'failed';

export interface InTripCausalTelemetryResult {
  path: InTripCausalTelemetryPath;
  snapshotId?: string;
  causalCounterfactualClosed?: boolean;
  causalCounterfactualReport?: CausalCounterfactualReport;
  travelEventPersisted?: boolean;
  reason?: string;
  error?: string;
}

export {
  buildCausalObservationFromEnvironmentEvent,
  buildCausalObservationFromInTripLoopUi,
  buildOpsOutcomeFromEnvironmentEvent,
  buildOpsOutcomeFromInTripLoopUi,
} from '@/lib/causal-in-trip-telemetry-builders';

const TELEMETRY_RESULT_PREFIX = 'tripnara_causal_telemetry_result_';

export function saveCausalTelemetryResult(
  tripId: string,
  result: InTripCausalTelemetryResult,
): void {
  try {
    sessionStorage.setItem(
      `${TELEMETRY_RESULT_PREFIX}${tripId}`,
      JSON.stringify({ ...result, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}

export function loadCausalTelemetryResult(
  tripId: string,
): (InTripCausalTelemetryResult & { savedAt?: string }) | null {
  try {
    const raw = sessionStorage.getItem(`${TELEMETRY_RESULT_PREFIX}${tripId}`);
    if (!raw) return null;
    return JSON.parse(raw) as InTripCausalTelemetryResult & { savedAt?: string };
  } catch {
    return null;
  }
}

function pickOpsSnapshotId(
  snapshots: Array<{ id: string; hasOutcome: boolean }>,
): string | undefined {
  const pending = snapshots.find((s) => !s.hasOutcome);
  return pending?.id ?? snapshots[0]?.id;
}

async function tryOpsOutcomePath(
  tripId: string,
  outcome: OpsRealityOutcomePayloadV1,
  source: string,
): Promise<InTripCausalTelemetryResult | null> {
  const byTrip = await decisionEngineApi.getOpsRealityByTrip(tripId);
  const snapshotId = pickOpsSnapshotId(byTrip.snapshots);
  if (!snapshotId) return null;

  const result = await decisionEngineApi.postOpsRealityOutcomeWithCausalContext(snapshotId, {
    outcome,
    tripId,
    source,
  });

  return {
    path: 'ops_outcome',
    snapshotId,
    causalCounterfactualClosed: result.causalCounterfactualClosed,
    causalCounterfactualReport: result.causalCounterfactualReport,
    travelEventPersisted: result.travelEventPersisted,
  };
}

async function tryCausalOutcomePath(
  tripId: string,
  observation: CausalObservationV1,
): Promise<InTripCausalTelemetryResult | null> {
  const ctx = buildCausalOutcomeContext(tripId);
  if (!ctx) return null;

  const result = await decisionEngineApi.postCausalOutcome({
    ...ctx,
    metrics: observation.metrics,
    missed_appointment: observation.missed_appointment,
    narrative: observation.narrative,
  });

  return {
    path: 'causal_outcome',
    causalCounterfactualReport: result.report
      ? {
          causalityId: ctx.causality_id,
          metricDeltas: result.report.metricDeltas,
          userFacingAssessment: result.report.userFacingAssessment,
          missedAppointment: observation.missed_appointment,
          narrative: observation.narrative,
        }
      : undefined,
    travelEventPersisted: result.travelEventPersisted,
  };
}

function persistTelemetryEcho(tripId: string, result: InTripCausalTelemetryResult): void {
  if (!loadCausalRuntimeSession(tripId)) return;
  updateCausalRuntimeEcho(tripId, {
    icelandCausalCalibration: result.causalCounterfactualClosed
      ? { sampleCount: 1, updatedAt: new Date().toISOString() }
      : undefined,
    causalCounterfactualReport: result.causalCounterfactualReport,
  });
}

function finalizeTelemetryResult(
  tripId: string,
  result: InTripCausalTelemetryResult,
): InTripCausalTelemetryResult {
  saveCausalTelemetryResult(tripId, result);
  return result;
}

/** 环境事件锁定后提交 telemetry（fail-open，不阻断主流程） */
export async function submitInTripCausalTelemetryForEnvironmentEvent(
  tripId: string,
  detail: EnvironmentEventDetail,
): Promise<InTripCausalTelemetryResult> {
  const outcome = buildOpsOutcomeFromEnvironmentEvent(detail);
  const observation =
    parseCausalObservation(outcome.extensions) ??
    buildCausalObservationFromEnvironmentEvent(detail);

  try {
    const opsResult = await tryOpsOutcomePath(tripId, outcome, 'in_trip_environment_event');
    if (opsResult) {
      persistTelemetryEcho(tripId, opsResult);
      return finalizeTelemetryResult(tripId, opsResult);
    }
  } catch (error) {
    console.warn('[causal-in-trip-telemetry] ops outcome failed', error);
  }

  try {
    const causalResult = await tryCausalOutcomePath(tripId, observation);
    if (causalResult) {
      persistTelemetryEcho(tripId, causalResult);
      return finalizeTelemetryResult(tripId, causalResult);
    }
  } catch (error) {
    console.warn('[causal-in-trip-telemetry] causal-outcome failed', error);
    return finalizeTelemetryResult(tripId, {
      path: 'failed',
      error: error instanceof Error ? error.message : 'causal-outcome 失败',
    });
  }

  return finalizeTelemetryResult(tripId, {
    path: 'skipped',
    reason: 'no_ops_snapshot_and_no_session_cache',
  });
}

/** 行中 recovery loop 采纳后提交 telemetry */
export async function submitInTripCausalTelemetryForRecoveryLoop(
  tripId: string,
  ui: InTripLoopUiView,
  environmentEventId?: string,
): Promise<InTripCausalTelemetryResult> {
  const outcome = buildOpsOutcomeFromInTripLoopUi(ui, environmentEventId);
  const observation =
    parseCausalObservation(outcome.extensions) ??
    buildCausalObservationFromInTripLoopUi(ui);

  try {
    const opsResult = await tryOpsOutcomePath(tripId, outcome, 'in_trip_recovery_loop');
    if (opsResult) {
      persistTelemetryEcho(tripId, opsResult);
      return finalizeTelemetryResult(tripId, opsResult);
    }
  } catch (error) {
    console.warn('[causal-in-trip-telemetry] recovery ops outcome failed', error);
  }

  try {
    const causalResult = await tryCausalOutcomePath(tripId, observation);
    if (causalResult) {
      persistTelemetryEcho(tripId, causalResult);
      return finalizeTelemetryResult(tripId, causalResult);
    }
  } catch (error) {
    console.warn('[causal-in-trip-telemetry] recovery causal-outcome failed', error);
    return finalizeTelemetryResult(tripId, {
      path: 'failed',
      error: error instanceof Error ? error.message : 'causal-outcome 失败',
    });
  }

  return finalizeTelemetryResult(tripId, {
    path: 'skipped',
    reason: 'no_ops_snapshot_and_no_session_cache',
  });
}
