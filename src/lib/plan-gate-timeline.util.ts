/** Plan Gate 物化写入时间轴的 ItineraryItem note 前缀 */
export const PLAN_GATE_TIMELINE_NOTE_PREFIX = '[PlanGate]';

export function isPlanGateTimelineItem(note?: string | null): boolean {
  if (!note) return false;
  return note.trimStart().startsWith(PLAN_GATE_TIMELINE_NOTE_PREFIX);
}

/** 展示用：去掉 note 中的 [PlanGate] 前缀（保留其余说明） */
export function stripPlanGateTimelineNotePrefix(note?: string | null): string | undefined {
  if (!note) return undefined;
  const trimmed = note.trimStart();
  if (!trimmed.startsWith(PLAN_GATE_TIMELINE_NOTE_PREFIX)) return note.trim();
  const rest = trimmed.slice(PLAN_GATE_TIMELINE_NOTE_PREFIX.length).trimStart();
  return rest.length > 0 ? rest : undefined;
}

export function formatPlanGateMaterializationSummary(changes?: {
  added?: number;
  modified?: number;
  removed?: number;
}): string | null {
  if (!changes) return null;
  const parts: string[] = [];
  if (changes.added != null && changes.added > 0) parts.push(`新增 ${changes.added} 项`);
  if (changes.modified != null && changes.modified > 0) parts.push(`更新 ${changes.modified} 项`);
  if (changes.removed != null && changes.removed > 0) parts.push(`移除 ${changes.removed} 项`);
  return parts.length > 0 ? parts.join(' · ') : null;
}
