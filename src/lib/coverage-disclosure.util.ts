import type { CoverageDisclosure } from '@/types/coverage-disclosure';

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.map((item) => String(item).trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export function normalizeCoverageDisclosure(raw: unknown): CoverageDisclosure | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const message = String(o.message ?? o.summary ?? '').trim() || undefined;
  const checkedSources = parseStringArray(
    o.checkedSources ?? o.checked_sources ?? o.included_sources ?? o.includedSources
  );
  const uncheckedDimensions = parseStringArray(
    o.uncheckedDimensions ??
      o.unchecked_dimensions ??
      o.missing_dimensions ??
      o.missingDimensions ??
      o.gaps
  );
  const dataFreshnessNote =
    o.dataFreshnessNote != null
      ? String(o.dataFreshnessNote)
      : o.data_freshness_note != null
        ? String(o.data_freshness_note)
        : undefined;
  const analyzedAt =
    o.analyzedAt != null
      ? String(o.analyzedAt)
      : o.analyzed_at != null
        ? String(o.analyzed_at)
        : undefined;

  if (!message && !checkedSources?.length && !uncheckedDimensions?.length) return null;

  return {
    ...(message ? { message } : {}),
    ...(checkedSources ? { checkedSources } : {}),
    ...(uncheckedDimensions ? { uncheckedDimensions } : {}),
    ...(dataFreshnessNote ? { dataFreshnessNote } : {}),
    ...(analyzedAt ? { analyzedAt } : {}),
  };
}

export function pickCoverageDisclosureFromExplain(explain: unknown): CoverageDisclosure | null {
  if (!explain || typeof explain !== 'object') return null;
  const o = explain as Record<string, unknown>;
  return normalizeCoverageDisclosure(o.coverage_disclosure ?? o.coverageDisclosure);
}

export function hasCoverageDisclosureContent(d: CoverageDisclosure | null | undefined): boolean {
  if (!d) return false;
  return Boolean(
    d.message ||
      (d.checkedSources && d.checkedSources.length > 0) ||
      (d.uncheckedDimensions && d.uncheckedDimensions.length > 0)
  );
}
