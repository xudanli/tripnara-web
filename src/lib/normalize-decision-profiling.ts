import type { DecisionProfilingPayload } from '@/types/trip-decision-profiling';
import type {
  OnboardingStatus,
  ProfileReuseBlockedReason,
  ProfileReuseEligibility,
  ProfileReusePreview,
} from '@/types/trip-decision-profiling';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

const REUSE_BLOCKED: ProfileReuseBlockedReason[] = [
  'no_profile',
  'quiz_version_mismatch',
  'profile_stale',
  'inferred_only',
];

function normalizeReusePreview(raw: unknown): ProfileReusePreview | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const confidenceRec = asRecord(rec.confidence);
  const travelStyle = asNumber(confidenceRec?.travelStyle);
  const moneyDna = asNumber(confidenceRec?.moneyDna);
  return {
    travelStyleLabel: asString(rec.travelStyleLabel) ?? '',
    moneyDnaSummary: asString(rec.moneyDnaSummary) ?? '',
    confidence: {
      travelStyle: travelStyle ?? 0,
      moneyDna: moneyDna ?? 0,
    },
  };
}

function normalizeReuse(raw: unknown): ProfileReuseEligibility | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const blockedRaw = asString(rec.blockedReason);
  const blockedReason =
    blockedRaw && REUSE_BLOCKED.includes(blockedRaw as ProfileReuseBlockedReason)
      ? (blockedRaw as ProfileReuseBlockedReason)
      : null;
  return {
    eligible: asBoolean(rec.eligible) ?? false,
    quizVersion: asString(rec.quizVersion),
    profileQuizVersion: asString(rec.profileQuizVersion),
    lastCompletedAt: asString(rec.lastCompletedAt),
    lastCompletedTripLabel: asString(rec.lastCompletedTripLabel),
    preview: normalizeReusePreview(rec.preview),
    blockedReason,
  };
}

function normalizeOnboarding(raw: unknown): DecisionProfilingPayload['onboarding'] | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  return {
    travelStyleCompleted: asBoolean(rec.travelStyleCompleted) ?? false,
    moneyDnaCompleted: asBoolean(rec.moneyDnaCompleted) ?? false,
    quizCompleted: asBoolean(rec.quizCompleted) ?? false,
    teamCompletionRate: asNumber(rec.teamCompletionRate) ?? 0,
    reuse: normalizeReuse(rec.reuse),
  };
}

function normalizeClientNavigation(raw: unknown): DecisionProfilingPayload['clientNavigation'] | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const tripId = asString(rec.tripId);
  const step = asString(rec.step) as DecisionProfilingPayload['clientNavigation'] extends infer T
    ? T extends { step: infer S }
      ? S
      : never
    : never;
  if (!tripId) return undefined;
  const actionRaw = asString(rec.action);
  const action =
    actionRaw === 'reuse_profile' || actionRaw === 'open_quiz' ? actionRaw : undefined;
  return {
    route: asString(rec.route) ?? 'decision_profiling_quiz',
    tripId,
    step: (step ?? 'travel_style') as 'travel_style' | 'money_dna' | 'overview',
    action,
  };
}

export function normalizeDecisionProfilingPayload(raw: unknown): DecisionProfilingPayload | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const triggered = asBoolean(rec.triggered) ?? false;
  if (!triggered && !rec.skippedReason) return null;

  return {
    triggered,
    tripId: asString(rec.tripId),
    userId: asString(rec.userId),
    onboarding: normalizeOnboarding(rec.onboarding),
    memberCount: asNumber(rec.memberCount),
    nextStep: asString(rec.nextStep) as DecisionProfilingPayload['nextStep'],
    promptKind: asString(rec.promptKind),
    agentIntroZh: asString(rec.agentIntroZh),
    clientNavigation: normalizeClientNavigation(rec.clientNavigation),
    skippedReason: asString(rec.skippedReason),
  };
}

export function pickDecisionProfilingFromPayload(
  payload: Record<string, unknown> | null | undefined,
): DecisionProfilingPayload | null {
  if (!payload) return null;
  return (
    normalizeDecisionProfilingPayload(payload.decision_profiling ?? payload.decisionProfiling) ??
    null
  );
}

/** Agent onboarding 片段 → 完整 OnboardingStatus（缺 tripId/userId 时填占位） */
export function mergeOnboardingReuse(
  tripId: string,
  userId: string,
  partial: DecisionProfilingPayload['onboarding'],
): OnboardingStatus | null {
  if (!partial) return null;
  return {
    tripId,
    userId,
    travelStyleCompleted: partial.travelStyleCompleted,
    moneyDnaCompleted: partial.moneyDnaCompleted,
    quizCompleted: partial.quizCompleted,
    teamCompletionRate: partial.teamCompletionRate,
    reuse: partial.reuse,
  };
}
