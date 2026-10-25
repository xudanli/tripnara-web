/** ItineraryItem.note 分流标记 — 与 BFF apply 写入格式对齐，供规划工作台与行中执行层共用 */

export const ITINERARY_SPLIT_PLAN_NOTE_PREFIX = '[split_plan:v1]';

export type ItinerarySplitPhase = 'shared' | 'branch' | 'rejoin';

export interface ItinerarySplitPlanNoteMarker {
  splitPlanId?: string;
  groupId?: string;
  groupLabel?: string;
  letter?: string;
  phase?: ItinerarySplitPhase;
  /** 参与成员 userId / collaborator id */
  memberIds?: string[];
  /** manual = 行程项上手动设置；省略时多为 BFF 应用 */
  source?: 'manual' | 'bff' | string;
}

/** 简写：`[分流:A|branch]` 或 `[分流:年轻组]` */
const LEGACY_SPLIT_NOTE = /^\[分流:([^\]|]+)(?:\|([^\]]+))?\]/;

function parseMemberIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  return ids.length ? ids : undefined;
}

function parseJsonMarker(json: string): ItinerarySplitPlanNoteMarker | null {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const phase = parsed.phase;
    const source = parsed.source;
    return {
      splitPlanId: typeof parsed.splitPlanId === 'string' ? parsed.splitPlanId : undefined,
      groupId: typeof parsed.groupId === 'string' ? parsed.groupId : undefined,
      groupLabel: typeof parsed.groupLabel === 'string' ? parsed.groupLabel : undefined,
      letter: typeof parsed.letter === 'string' ? parsed.letter : undefined,
      phase:
        phase === 'shared' || phase === 'branch' || phase === 'rejoin' ? phase : undefined,
      memberIds: parseMemberIds(parsed.memberIds ?? parsed.member_ids),
      source: typeof source === 'string' ? source : undefined,
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

export function formatItinerarySplitPlanNoteLine(
  marker: ItinerarySplitPlanNoteMarker,
): string {
  const payload: Record<string, unknown> = {};
  if (marker.splitPlanId) payload.splitPlanId = marker.splitPlanId;
  if (marker.groupId) payload.groupId = marker.groupId;
  if (marker.groupLabel) payload.groupLabel = marker.groupLabel;
  if (marker.letter) payload.letter = marker.letter;
  if (marker.phase) payload.phase = marker.phase;
  if (marker.memberIds?.length) payload.memberIds = marker.memberIds;
  if (marker.source) payload.source = marker.source;
  return `${ITINERARY_SPLIT_PLAN_NOTE_PREFIX}${JSON.stringify(payload)}`;
}

/** 将分流标记写回 note 首行；marker 为 null 时移除现有标记 */
export function mergeSplitPlanNoteIntoNote(
  note: string | null | undefined,
  marker: ItinerarySplitPlanNoteMarker | null,
): string | undefined {
  const body = stripSplitPlanNoteLines(note);
  if (!marker) return body || undefined;
  const line = formatItinerarySplitPlanNoteLine(marker);
  return body ? `${line}\n${body}` : line;
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

/** 将分流标记转为可读文案（不含 JSON） */
export function formatItinerarySplitPlanMarkerDisplay(
  marker: ItinerarySplitPlanNoteMarker,
): string {
  const parts: string[] = [];
  const phase = itinerarySplitPhaseLabel(marker.phase);
  if (phase) parts.push(phase);
  const group = formatItinerarySplitGroupLabel(marker);
  if (group && group !== phase) parts.push(group);
  if (marker.memberIds?.length) parts.push(`${marker.memberIds.length} 人`);
  return parts.length ? parts.join(' · ') : '分流活动';
}

const LEGACY_SPLIT_IN_TEXT = /\[分流:([^\]|]+)(?:\|([^\]]+))?\]/g;

function extractBalancedJsonObject(source: string, startIndex: number): string | null {
  if (source[startIndex] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  return null;
}

/**
 * 用户可见文案中隐藏分流 note 原始 JSON，替换为可读描述。
 * 例：`新增: [split_plan:v1]{...}` → `新增: 分流 · 分组 B · 1 人`
 */
export function sanitizeSplitPlanTextForDisplay(text?: string | null): string {
  if (!text?.trim()) return '';
  let next = text;
  let guard = 0;
  while (guard < 8) {
    guard += 1;
    const lower = next.toLowerCase();
    const prefixIdx = lower.indexOf(ITINERARY_SPLIT_PLAN_NOTE_PREFIX.toLowerCase());
    if (prefixIdx < 0) break;
    const afterPrefix = prefixIdx + ITINERARY_SPLIT_PLAN_NOTE_PREFIX.length;
    const jsonStart = next.indexOf('{', afterPrefix);
    const json = jsonStart >= 0 ? extractBalancedJsonObject(next, jsonStart) : null;
    const replaceEnd =
      json != null
        ? jsonStart + json.length
        : (() => {
            const nl = next.indexOf('\n', afterPrefix);
            return nl >= 0 ? nl : next.length;
          })();
    const marker = json ? parseJsonMarker(json) : null;
    const readable = marker
      ? formatItinerarySplitPlanMarkerDisplay(marker)
      : '分流活动';
    next = `${next.slice(0, prefixIdx)}${readable}${next.slice(replaceEnd)}`;
  }

  next = next.replace(LEGACY_SPLIT_IN_TEXT, (_full, token: string, phaseRaw?: string) => {
    const phase =
      phaseRaw === 'shared' || phaseRaw === 'branch' || phaseRaw === 'rejoin'
        ? phaseRaw
        : undefined;
    const letter = token && /^[A-Z]$/.test(token) ? token : undefined;
    return formatItinerarySplitPlanMarkerDisplay({
      letter,
      groupLabel: letter ? undefined : token,
      groupId: letter ? undefined : token,
      phase,
    });
  });

  return next
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*·\s*·\s*/g, ' · ')
    .trim();
}

/** 从行程项读出参与成员：顶层字段 > note 标记 > metadata */
export function resolveItineraryParticipantIds(item: {
  participantIds?: string[] | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}): string[] {
  if (item.participantIds?.length) return [...item.participantIds];
  const fromNote = parseItinerarySplitPlanNote(item.note)?.memberIds;
  if (fromNote?.length) return [...fromNote];
  const meta = item.metadata;
  if (meta && typeof meta === 'object') {
    const raw = meta.participantIds ?? meta.participant_ids;
    if (Array.isArray(raw)) {
      return raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    }
  }
  return [];
}
