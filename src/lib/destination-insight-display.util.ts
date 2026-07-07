import type {
  DestinationInsightEntry,
  DestinationInsightSourceRef,
} from '@/api/destination-insight.types';

function normalizeInsightText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function summariesAreDuplicate(a: string, b: string): boolean {
  const left = normalizeInsightText(a);
  const right = normalizeInsightText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 24 && right.length >= 24 && (left.includes(right) || right.includes(left))) {
    return true;
  }
  return false;
}

function sourceRefKey(ref: DestinationInsightSourceRef): string {
  return (
    ref.refId?.trim() ||
    ref.label?.trim() ||
    ref.id?.trim() ||
    ref.type?.trim() ||
    JSON.stringify(ref)
  );
}

function mergeSourceRefs(
  left?: DestinationInsightSourceRef[],
  right?: DestinationInsightSourceRef[],
): DestinationInsightSourceRef[] | undefined {
  const merged = [...(left ?? []), ...(right ?? [])];
  if (!merged.length) return undefined;

  const seen = new Set<string>();
  const out: DestinationInsightSourceRef[] = [];
  for (const ref of merged) {
    const key = sourceRefKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out.length ? out : undefined;
}

/** 同标题 / 近重复摘要合并为一条，避免「冲突解释」卡片堆叠 */
export function consolidateDestinationInsightEntries(
  entries: DestinationInsightEntry[],
): DestinationInsightEntry[] {
  const groups: Array<{ entry: DestinationInsightEntry; summaries: string[] }> = [];

  for (const entry of entries) {
    const titleKey = (entry.title ?? '').trim();
    const summaryText = (entry.summary ?? '').trim();
    if (!titleKey && !summaryText) continue;

    const existing = titleKey
      ? groups.find((group) => (group.entry.title ?? '').trim() === titleKey)
      : undefined;

    if (existing) {
      if (summaryText && !existing.summaries.some((line) => summariesAreDuplicate(line, summaryText))) {
        existing.summaries.push(summaryText);
      }
      existing.entry = {
        ...existing.entry,
        sourceRefs: mergeSourceRefs(existing.entry.sourceRefs, entry.sourceRefs),
        explanatoryOnly: Boolean(existing.entry.explanatoryOnly && entry.explanatoryOnly),
      };
      continue;
    }

    groups.push({
      entry: { ...entry },
      summaries: summaryText ? [summaryText] : [],
    });
  }

  return groups.map(({ entry, summaries }) => ({
    ...entry,
    summary:
      summaries.length === 0
        ? entry.summary
        : summaries.length === 1
          ? summaries[0]
          : summaries.join('\n'),
  }));
}

export function splitDestinationInsightSummary(summary?: string | null): string[] {
  if (!summary?.trim()) return [];
  return summary
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
