import { useCallback, useEffect, useState } from 'react';
import { loadCausalRuntimeSession } from '@/lib/causal-runtime-session';
import { loadCausalTelemetryResult } from '@/lib/causal-in-trip-telemetry';
import type { InTripCausalTelemetryResult } from '@/lib/causal-in-trip-telemetry';
import type {
  CausalCounterfactualReport,
  CausalPersonaProjection,
  IcelandCausalCalibration,
  IcelandSelfDriveCausalAssessment,
} from '@/types/causal-travel-runtime';

export interface InTripCausalInsightModel {
  projection?: CausalPersonaProjection;
  counterfactual?: CausalCounterfactualReport;
  iceland?: IcelandSelfDriveCausalAssessment;
  calibration?: IcelandCausalCalibration;
  hasSession: boolean;
  lastTelemetry?: InTripCausalTelemetryResult | null;
}

export function readInTripCausalInsight(tripId: string): InTripCausalInsightModel {
  const cached = loadCausalRuntimeSession(tripId);
  const lastTelemetry = loadCausalTelemetryResult(tripId);
  if (!cached) {
    return { hasSession: false, lastTelemetry };
  }
  return {
    hasSession: true,
    projection: cached.echo?.causalPersonaProjection,
    counterfactual: cached.lastCounterfactualReport,
    iceland: cached.echo?.icelandSelfDriveCausalAssessment,
    calibration: cached.echo?.icelandCausalCalibration,
    lastTelemetry,
  };
}

/** 行中页读取 session 缓存的因果投影 / 闭环报告（telemetry 后 refresh） */
export function useInTripCausalInsight(tripId: string | null | undefined) {
  const [model, setModel] = useState<InTripCausalInsightModel>({ hasSession: false });

  const refresh = useCallback(() => {
    if (!tripId) {
      setModel({ hasSession: false });
      return;
    }
    setModel(readInTripCausalInsight(tripId));
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { model, refresh };
}
