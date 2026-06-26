import type { Blocker } from '@/types/readiness';
import type { CascadeUiHint } from '@/types/readiness-cascade';

function normalizeToken(s: string): string {
  return s.trim().toLowerCase();
}

function hintMatchesBlocker(hint: CascadeUiHint, blocker: Blocker): boolean {
  const blockerTitle = normalizeToken(blocker.title);
  const blockerScope = normalizeToken(blocker.impactScope);
  const hintMsg = normalizeToken(hint.message);
  const hintLabel = hint.entityLabel ? normalizeToken(hint.entityLabel) : '';

  if (hint.id && hint.id === blocker.id) return true;
  if (hintLabel && (blockerTitle.includes(hintLabel) || blockerScope.includes(hintLabel))) {
    return true;
  }
  if (hintMsg && blockerTitle && (hintMsg.includes(blockerTitle.slice(0, 12)) || blockerTitle.includes(hintMsg.slice(0, 12)))) {
    return true;
  }
  return false;
}

/** 将级联卡分配到各 blocker；未匹配的进入 orphan */
export function partitionCascadeHintsByBlockers(
  blockers: Blocker[],
  hints: CascadeUiHint[]
): { byBlockerId: Record<string, CascadeUiHint[]>; orphanHints: CascadeUiHint[] } {
  const byBlockerId: Record<string, CascadeUiHint[]> = {};
  const orphanHints: CascadeUiHint[] = [];
  const assigned = new Set<string>();

  for (const blocker of blockers) {
    const matched = hints.filter((h) => !assigned.has(h.id) && hintMatchesBlocker(h, blocker));
    if (matched.length > 0) {
      byBlockerId[blocker.id] = matched;
      matched.forEach((h) => assigned.add(h.id));
    }
  }

  for (const hint of hints) {
    if (!assigned.has(hint.id)) orphanHints.push(hint);
  }

  return { byBlockerId, orphanHints };
}
