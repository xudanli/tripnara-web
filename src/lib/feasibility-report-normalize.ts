import { normalizeCoverageDisclosure } from '@/lib/coverage-disclosure.util';
import { computeCanStartExecute } from '@/lib/feasibility-can-start-execute';
import type {
  FeasibilityProbabilisticAssessmentDto,
  TripFeasibilityReportDto,
} from '@/types/trip-feasibility-report';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((x): x is string => typeof x === 'string');
  return out.length > 0 ? out : undefined;
}

function normalizeProbabilisticAssessment(
  raw: unknown,
): FeasibilityProbabilisticAssessmentDto | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const method = asString(o.method);
  if (method !== 'MONTE_CARLO' && method !== 'HEURISTIC' && method !== 'UNAVAILABLE') {
    return undefined;
  }

  const ciRaw = asRecord(o.confidenceInterval ?? o.confidence_interval);
  const riskRaw = asRecord(o.riskMetrics ?? o.risk_metrics);
  const pomdpRaw = asRecord(o.pomdp);
  const auditRaw = asRecord(o.audit);
  const mcRaw = asRecord(o.monteCarloDiagnostics ?? o.monte_carlo_diagnostics);
  const driftRaw = auditRaw
    ? asRecord(auditRaw.drift_vector ?? auditRaw.driftVector)
    : null;

  const dimRaw = asRecord(o.dimensionExpectations ?? o.dimension_expectations);
  const dimensionExpectations = dimRaw
    ? Object.fromEntries(
        Object.entries(dimRaw)
          .map(([k, v]) => [k, asNumber(v)])
          .filter((entry): entry is [string, number] => entry[1] != null),
      )
    : undefined;

  const assessment: FeasibilityProbabilisticAssessmentDto = { method };

  const feasibilityProbability = asNumber(o.feasibilityProbability ?? o.feasibility_probability);
  if (feasibilityProbability != null) assessment.feasibilityProbability = feasibilityProbability;

  const expectedUtility = asNumber(o.expectedUtility ?? o.expected_utility);
  if (expectedUtility != null) assessment.expectedUtility = expectedUtility;

  const narrative = asString(o.narrative);
  if (narrative) assessment.narrative = narrative;

  if (ciRaw) {
    const lower = asNumber(ciRaw.lower);
    const upper = asNumber(ciRaw.upper);
    const level = asNumber(ciRaw.level);
    if (lower != null && upper != null && level != null) {
      assessment.confidenceInterval = { lower, upper, level };
    }
  }

  if (riskRaw) {
    const downRiskProbability = asNumber(riskRaw.downRiskProbability ?? riskRaw.down_risk_probability);
    const worstCase = asNumber(riskRaw.worstCase ?? riskRaw.worst_case);
    const bestCase = asNumber(riskRaw.bestCase ?? riskRaw.best_case);
    const volatility = asNumber(riskRaw.volatility);
    if (
      downRiskProbability != null &&
      worstCase != null &&
      bestCase != null &&
      volatility != null
    ) {
      assessment.riskMetrics = { downRiskProbability, worstCase, bestCase, volatility };
    }
  }

  if (dimensionExpectations && Object.keys(dimensionExpectations).length > 0) {
    assessment.dimensionExpectations = dimensionExpectations;
  }

  if (pomdpRaw) {
    const beliefRefinement = asString(pomdpRaw.beliefRefinement ?? pomdpRaw.belief_refinement);
    if (
      beliefRefinement === 'POMDP' ||
      beliefRefinement === 'NONE' ||
      beliefRefinement === 'META_ALLOCATOR'
    ) {
      assessment.pomdp = {
        beliefRefinement,
        observationProvenance: asString(
          pomdpRaw.observationProvenance ?? pomdpRaw.observation_provenance,
        ),
        independenceTier: (() => {
          const tier = asString(pomdpRaw.independenceTier ?? pomdpRaw.independence_tier);
          if (tier === 'INDIRECT_PROXY' || tier === 'DIRECT' || tier === 'NONE') return tier;
          return undefined;
        })(),
        worldSource: (() => {
          const src = asString(pomdpRaw.worldSource ?? pomdpRaw.world_source);
          if (src === 'world.buildContext' || src === 'dso_stub') return src;
          return undefined;
        })(),
      };
    }
  }

  if (auditRaw) {
    const decisionOsAudit = asRecord(
      auditRaw.decisionOsAudit ?? auditRaw.decision_os_audit,
    );
    assessment.audit = {
      session_consistency_score: asNumber(
        auditRaw.session_consistency_score ?? auditRaw.sessionConsistencyScore,
      ),
      dominant_cid: asString(auditRaw.dominant_cid ?? auditRaw.dominantCid),
      ...(decisionOsAudit ? { decisionOsAudit } : {}),
      ...(driftRaw
        ? {
            drift_vector: {
              delta_utility:
                asNumber(driftRaw.delta_utility ?? driftRaw.deltaUtility) ?? 0,
              delta_feasibility_proxy:
                asNumber(driftRaw.delta_feasibility_proxy ?? driftRaw.deltaFeasibilityProxy) ??
                0,
            },
          }
        : {}),
    };
  }

  if (mcRaw) {
    const sampleSize = asNumber(mcRaw.sampleSize ?? mcRaw.sample_size);
    const durationMs = asNumber(mcRaw.durationMs ?? mcRaw.duration_ms);
    const convergenceAchieved = asBoolean(
      mcRaw.convergenceAchieved ?? mcRaw.convergence_achieved,
    );
    if (sampleSize != null && durationMs != null && convergenceAchieved != null) {
      assessment.monteCarloDiagnostics = { sampleSize, durationMs, convergenceAchieved };
    }
  }

  const keyRiskFactors = asStringArray(o.keyRiskFactors ?? o.key_risk_factors);
  if (keyRiskFactors) assessment.keyRiskFactors = keyRiskFactors;

  return assessment;
}

/** BFF snake_case → TripFeasibilityReportDto 扩展字段 */
export function normalizeFeasibilityReportExtensions(
  report: TripFeasibilityReportDto,
  raw?: Record<string, unknown> | null,
): TripFeasibilityReportDto {
  const o = raw ?? (report as unknown as Record<string, unknown>);
  const disclosureRaw = o.coverageDisclosure ?? o.coverage_disclosure;
  const phaseHint = o.phaseHint ?? o.phase_hint;
  const daysUntilStart = o.daysUntilStart ?? o.days_until_start;
  const canStartExecuteRaw = o.canStartExecute ?? o.can_start_execute;
  const probabilisticRaw =
    o.probabilisticAssessment ?? o.probabilistic_assessment ?? report.probabilisticAssessment;

  const next: TripFeasibilityReportDto = {
    ...report,
    ...(phaseHint != null ? { phaseHint: String(phaseHint) } : {}),
    ...(daysUntilStart != null ? { daysUntilStart: Number(daysUntilStart) } : {}),
    ...(canStartExecuteRaw != null ? { canStartExecute: Boolean(canStartExecuteRaw) } : {}),
    coverageDisclosure:
      report.coverageDisclosure ??
      normalizeCoverageDisclosure(disclosureRaw) ??
      undefined,
  };

  const probabilisticAssessment = normalizeProbabilisticAssessment(probabilisticRaw);
  if (probabilisticAssessment) {
    next.probabilisticAssessment = probabilisticAssessment;
  }

  if (next.canStartExecute == null) {
    next.canStartExecute = computeCanStartExecute(next);
  }

  return next;
}
