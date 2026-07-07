/**
 * data.comparisonView 归一化 — evaluate / options 内联
 */
import type {
  CandidateComparisonOriginalIntent,
  CandidateComparisonRejection,
  CandidateComparisonRow,
  CandidateComparisonView,
  ComparisonCostCell,
  ComparisonDimensionCell,
} from '@/types/candidate-comparison';

function trimString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeDimensionCell(raw: unknown): ComparisonDimensionCell | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const label = trimString(record.label);
  if (!label) return undefined;
  return {
    status: trimString(record.status) as ComparisonDimensionCell['status'],
    label,
    note: trimString(record.note),
  };
}

function normalizeCostCell(raw: unknown): ComparisonCostCell | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const label = trimString((raw as Record<string, unknown>).label);
  return label ? { label } : undefined;
}

function normalizeRow(raw: unknown): CandidateComparisonRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const candidateId = trimString(record.candidateId);
  const schemeLabel = trimString(record.schemeLabel);
  const title = trimString(record.title);
  if (!candidateId || !schemeLabel || !title) return null;

  const drivingDeltaMinutes =
    typeof record.drivingDeltaMinutes === 'number' &&
    Number.isFinite(record.drivingDeltaMinutes)
      ? record.drivingDeltaMinutes
      : undefined;

  return {
    schemeLabel,
    candidateId,
    title,
    recommended: record.recommended === true,
    selectable: record.selectable !== false,
    safety: normalizeDimensionCell(record.safety),
    pace: normalizeDimensionCell(record.pace),
    experienceRetentionLabel: trimString(record.experienceRetentionLabel),
    cost: normalizeCostCell(record.cost),
    drivingDeltaMinutes,
  };
}

function normalizeOriginalIntent(raw: unknown): CandidateComparisonOriginalIntent | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const labels = Array.isArray(record.labels)
    ? record.labels
        .map((item) => trimString(item))
        .filter((item): item is string => Boolean(item))
    : undefined;
  const intentRefs = Array.isArray(record.intentRefs)
    ? record.intentRefs
        .map((item) => trimString(item))
        .filter((item): item is string => Boolean(item))
    : undefined;
  const narrative = trimString(record.narrative);
  if (!labels?.length && !narrative && !intentRefs?.length) return undefined;
  return { intentRefs, labels, narrative };
}

function normalizeRejection(raw: unknown): CandidateComparisonRejection | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const message = trimString(record.message);
  if (!message) return null;
  const reasonCodes = Array.isArray(record.reasonCodes)
    ? record.reasonCodes
        .map((item) => trimString(item))
        .filter((item): item is string => Boolean(item))
    : undefined;
  return {
    candidateId: trimString(record.candidateId),
    reasonCodes,
    message,
  };
}

export function normalizeCandidateComparisonView(raw: unknown): CandidateComparisonView | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const rows = Array.isArray(record.rows)
    ? record.rows
        .map(normalizeRow)
        .filter((row): row is CandidateComparisonRow => row != null)
    : [];
  if (!rows.length) return null;

  const rejections = Array.isArray(record.rejections)
    ? record.rejections
        .map(normalizeRejection)
        .filter((item): item is CandidateComparisonRejection => item != null)
    : undefined;

  return {
    schemaId: trimString(record.schemaId),
    originalIntent: normalizeOriginalIntent(record.originalIntent),
    recommendedCandidateId: trimString(record.recommendedCandidateId),
    headline: trimString(record.headline),
    rows,
    rejections,
  };
}

/** 从 Gateway data 载荷提取 comparisonView */
export function extractComparisonViewFromPayload(data: unknown): CandidateComparisonView | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  return normalizeCandidateComparisonView(record.comparisonView);
}
