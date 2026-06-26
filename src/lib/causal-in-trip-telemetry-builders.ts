/**
 * 行中 telemetry 观测 / outcome 构建（纯函数，无 API 依赖）
 */

import { buildCausalObservation } from '@/lib/causal-observation.util';
import type { CausalObservationV1 } from '@/types/causal-travel-runtime';
import type { OpsRealityOutcomePayloadV1 } from '@/types/decision-engine';
import type { EnvironmentEventDetail } from '@/types/in-trip-execution';
import type { InTripLoopUiView } from '@/types/trip-loop';

export function buildCausalObservationFromEnvironmentEvent(
  detail: EnvironmentEventDetail,
): CausalObservationV1 {
  const missed =
    detail.severity === 'red' &&
    (detail.type === 'weather' || detail.type === 'traffic' || detail.type === 'attraction');

  let iceland_miss_prob: number | undefined;
  if (detail.severity === 'red') iceland_miss_prob = 1;
  else if (detail.severity === 'yellow') iceland_miss_prob = 0.55;
  else iceland_miss_prob = 0.15;

  return buildCausalObservation({
    metrics: { iceland_miss_prob },
    missed_appointment: missed,
    narrative: detail.description,
  });
}

export function buildCausalObservationFromInTripLoopUi(
  ui: InTripLoopUiView,
): CausalObservationV1 {
  const impact = ui.layers.impact.toLowerCase();
  const missed =
    impact.includes('错过') ||
    impact.includes('miss') ||
    ui.phase === 'awaiting_approval';

  return buildCausalObservation({
    metrics: {
      iceland_miss_prob: missed ? 0.85 : ui.phase === 'impact_assessed' ? 0.45 : 0.2,
    },
    missed_appointment: missed,
    narrative: ui.headline,
  });
}

export function buildOpsOutcomeFromEnvironmentEvent(
  detail: EnvironmentEventDetail,
): OpsRealityOutcomePayloadV1 {
  const causalObservation = buildCausalObservationFromEnvironmentEvent(detail);
  return {
    schema: 'p-ops-2-outcome/v1',
    recordedAtIso: new Date().toISOString(),
    summary: `环境事件已锁定：${detail.description}`,
    delta: {
      hardWeatherRealized: detail.type === 'weather' && detail.severity !== 'green',
      environmentEventId: detail.id,
      selectedPlanId: detail.resolution?.selectedPlanId,
      eventType: detail.type,
    },
    extensions: {
      causal_observation: causalObservation,
      observation_export: {
        source: 'in_trip_environment_event',
        eventId: detail.id,
        severity: detail.severity,
        type: detail.type,
      },
    },
  };
}

export function buildOpsOutcomeFromInTripLoopUi(
  ui: InTripLoopUiView,
  environmentEventId?: string,
): OpsRealityOutcomePayloadV1 {
  const causalObservation = buildCausalObservationFromInTripLoopUi(ui);
  return {
    schema: 'p-ops-2-outcome/v1',
    recordedAtIso: new Date().toISOString(),
    summary: ui.headline,
    delta: {
      hardWeatherRealized:
        ui.layers.happened.toLowerCase().includes('风') ||
        ui.layers.happened.toLowerCase().includes('weather'),
      environmentEventId,
      inTripLoopPhase: ui.phase,
    },
    extensions: {
      causal_observation: causalObservation,
      observation_export: {
        source: 'in_trip_recovery_loop',
        phase: ui.phase,
        happened: ui.layers.happened,
        impact: ui.layers.impact,
      },
    },
  };
}
