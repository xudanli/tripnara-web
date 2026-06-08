import type { CompanionMatch, CompanionMatchDimensionBreakdown } from '@/types/odyssey-intake';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** 后端可能返回 0–1 小数或 0–100 整数 */
export function formatMatchCompatibilityPercent(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score > 0 && score <= 1) return Math.round(score * 100);
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function resolveCompanionDisplayName(match: {
  displayName?: string | null;
  cardTitle?: string | null;
  mbtiType?: string;
  userId?: string;
}): string {
  const name = match.displayName?.trim();
  if (name && !looksLikeUuid(name)) return name;

  const title = match.cardTitle?.trim();
  if (title) return title;

  if (match.mbtiType?.trim()) return `${match.mbtiType.trim()} 旅伴`;
  return '旅伴';
}

export function companionAvatarInitial(match: {
  displayName?: string | null;
  cardTitle?: string | null;
  mbtiType?: string;
}): string {
  const label = resolveCompanionDisplayName(match);
  const char = [...label][0];
  if (char && !/[\d-]/.test(char)) return char.toUpperCase();
  return match.mbtiType?.slice(0, 1)?.toUpperCase() ?? '旅';
}

function normalizeDimensionBreakdown(raw: unknown): CompanionMatchDimensionBreakdown {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const num = (key: string) => (typeof record[key] === 'number' ? record[key] : 0);
  return {
    eiFit: num('eiFit') || num('ei_fit'),
    tfFit: num('tfFit') || num('tf_fit'),
    energyFit: num('energyFit') || num('energy_fit'),
    ambiguityFit: num('ambiguityFit') || num('ambiguity_fit'),
  };
}

export function normalizeCompanionMatch(raw: unknown): CompanionMatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const userId = asString(record.userId ?? record.user_id);
  if (!userId) return null;

  const cardTitle = asString(
    record.cardTitle ?? record.card_title ?? record.personaTitle ?? record.persona_title,
    '旅伴'
  );

  const rawScore =
    typeof record.compatibilityScore === 'number'
      ? record.compatibilityScore
      : typeof record.compatibility_score === 'number'
        ? record.compatibility_score
        : typeof record.compatibilityPercent === 'number'
          ? record.compatibilityPercent
          : 0;

  const match: CompanionMatch = {
    userId,
    displayName: asString(record.displayName ?? record.display_name) || undefined,
    avatarUrl: asString(record.avatarUrl ?? record.avatar_url) || undefined,
    mbtiType: asString(record.mbtiType ?? record.mbti_type, '—'),
    cardTitle,
    compatibilityScore: formatMatchCompatibilityPercent(rawScore),
    dimensionBreakdown: normalizeDimensionBreakdown(
      record.dimensionBreakdown ?? record.dimension_breakdown
    ),
    destination: asString(record.destination) || undefined,
    dateRange: asString(record.dateRange ?? record.date_range) || undefined,
  };

  if (!match.displayName || looksLikeUuid(match.displayName)) {
    match.displayName = resolveCompanionDisplayName(match);
  }

  return match;
}

export function normalizeCompanionMatches(raw: unknown): CompanionMatch[] {
  if (Array.isArray(raw)) {
    return raw
      .map((row) => normalizeCompanionMatch(row))
      .filter((m): m is CompanionMatch => m != null);
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const nested = record.matches ?? record.items ?? record.data;
    if (Array.isArray(nested)) return normalizeCompanionMatches(nested);
  }
  return [];
}

export function normalizeMatchResult(raw: unknown): { matches: CompanionMatch[] } {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.matches)) {
      return { matches: normalizeCompanionMatches(record.matches) };
    }
  }
  return { matches: normalizeCompanionMatches(raw) };
}
