/** ItineraryItem.note 分流标记 — 与 BFF apply 写入格式对齐，供规划工作台与行中执行层共用 */

export const ITINERARY_SPLIT_PLAN_NOTE_PREFIX = '[split_plan:v1]';

export type ItinerarySplitPhase = 'shared' | 'branch' | 'rejoin';

export interface ItinerarySplitPlanNoteMarker {
  splitPlanId?: string;
  groupId?: string;
  groupLabel?: string;
  letter?: string;
  phase?: ItinerarySplitPhase;
}

/** 简写：`[分流:A|branch]` 或 `[分流:年轻组]` */
const LEGACY_SPLIT_NOTE = /^\[分流:([^\]|]+)(?:\|([^\]]+))?\]/;

function parseJsonMarker(json: string): ItinerarySplitPlanNoteMarker | null {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const phase = parsed.phase;
    return {
      splitPlanId: typeof parsed.splitPlanId === 'string' ? parsed.splitPlanId : undefined,
      groupId: typeof parsed.groupId === 'string' ? parsed.groupId : undefined,
      groupLabel: typeof parsed.groupLabel === 'string' ? parsed.groupLabel : undefined,
      letter: typeof parsed.letter === 'string' ? parsed.letter : undefined,
      phase:
        phase === 'shared' || phase === 'branch' || phase === 'rejoin' ? phase : undefined,
    };
  } catch {
    return null;
  }
}

/** 从 note 首行解析分流标记；无标记返回 null */
export function parseItinerarySplitPlanNote(
  note?: string | null,
): ItinerarySplitPlanNoteMarker | null {
  if (!note?.trim()) return null;
  const firstLine = note.split('\n')[0]?.trim() ?? '';
  if (firstLine.startsWith(ITINERARY_SPLIT_PLAN_NOTE_PREFIX)) {
    const json = firstLine.slice(ITINERARY_SPLIT_PLAN_NOTE_PREFIX.length).trim();
    return parseJsonMarker(json);
  }
  const legacy = LEGACY_SPLIT_NOTE.exec(firstLine);
  if (!legacy) return null;
  const token = legacy[1]?.trim();
  const phaseRaw = legacy[2]?.trim();
  const phase =
    phaseRaw === 'shared' || phaseRaw === 'branch' || phaseRaw === 'rejoin'
      ? phaseRaw
      : undefined;
  const letter = token && /^[A-Z]$/.test(token) ? token : undefined;
  return {
    letter,
    groupLabel: letter ? undefined : token,
    groupId: letter ? undefined : token,
    phase,
  };
}

export function hasItinerarySplitPlanNote(note?: string | null): boolean {
  return parseItinerarySplitPlanNote(note) != null;
}

/** 展示用：去掉首行分流标记，保留其余 note 正文 */
export function stripSplitPlanNoteLines(note?: string | null): string {
  if (!note?.trim()) return '';
  const lines = note.split('\n');
  const first = lines[0]?.trim() ?? '';
  if (
    first.startsWith(ITINERARY_SPLIT_PLAN_NOTE_PREFIX) ||
    LEGACY_SPLIT_NOTE.test(first)
  ) {
    return lines.slice(1).join('\n').trim();
  }
  return note.trim();
}

export function formatItinerarySplitGroupLabel(
  marker: ItinerarySplitPlanNoteMarker,
): string {
  if (marker.groupLabel?.trim()) return marker.groupLabel.trim();
  if (marker.letter?.trim()) return `分组 ${marker.letter.trim()}`;
  if (marker.groupId?.trim()) return marker.groupId.trim();
  if (marker.phase === 'rejoin') return '汇合';
  if (marker.phase === 'shared') return '全员';
  return '分流';
}

export function itinerarySplitPhaseLabel(phase?: ItinerarySplitPhase): string | null {
  if (phase === 'shared') return '全员';
  if (phase === 'branch') return '分流';
  if (phase === 'rejoin') return '汇合';
  return null;
}
