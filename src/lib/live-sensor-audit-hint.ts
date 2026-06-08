/**
 * live_sensor_audit 折叠区标题 hint：第一行为本轮 MCP 类型摘要，第二行为 ok: false 的失败摘要（与后端结构容错对齐）。
 */

const MAX_HINT_CHARS = 220;
const MAX_FAILURE_ITEMS = 4;
const MAX_ERROR_CHARS = 40;

/** 精确通道 key（归一化后）→ 展示名 */
const CHANNEL_LABEL_EXACT: Record<string, string> = {
  weather: '天气',
  accommodation: '住宿',
  hotel: '住宿',
  hotels: '住宿',
  lodging: '住宿',
  stay: '住宿',
  car_rental: '租车',
  carrental: '租车',
  rental: '租车',
  flight: '航班',
  restaurant: '餐饮',
  poi: '景点',
  traffic: '路况',
};

/** 模糊兜底（按顺序匹配首个） */
const CHANNEL_LABEL_FUZZY: Array<{ re: RegExp; label: string }> = [
  { re: /weather|气象|^wx$/i, label: '天气' },
  { re: /hotel|accommodation|lodging|住宿|旅店/i, label: '住宿' },
  { re: /car_rental|car\s*rental|租车/i, label: '租车' },
  { re: /flight|航班|机票/i, label: '航班' },
  { re: /restaurant|餐饮|餐厅/i, label: '餐饮' },
  { re: /\bpoi\b|景点/i, label: '景点' },
  { re: /traffic|路况/i, label: '路况' },
];

function normalizeChannelKey(rawKey: string): string {
  return rawKey.trim().toLowerCase().replace(/\s+/g, '_');
}

function labelForChannelKey(rawKey: string): string {
  const k = normalizeChannelKey(rawKey);
  if (!k) return '未知';
  if (CHANNEL_LABEL_EXACT[k]) return CHANNEL_LABEL_EXACT[k];
  for (const { re, label } of CHANNEL_LABEL_FUZZY) {
    if (re.test(rawKey)) return label;
  }
  return rawKey.trim();
}

function mergeChannelBlocks(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> {
  let okOut: boolean | undefined;
  if (a.ok === false || b.ok === false) okOut = false;
  else if (a.ok === true || b.ok === true) okOut = true;
  else if (typeof a.ok === 'boolean') okOut = a.ok;
  else if (typeof b.ok === 'boolean') okOut = b.ok;

  const errPick =
    (b.ok === false ? (b.error ?? b.err ?? b.message) : undefined) ??
    (a.ok === false ? (a.error ?? a.err ?? a.message) : undefined) ??
    b.error ??
    b.err ??
    a.error ??
    a.err;

  return {
    ...a,
    ...b,
    ...(typeof okOut === 'boolean' ? { ok: okOut } : {}),
    ...(errPick !== undefined ? { error: errPick } : {}),
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** 错误内容压成一行 */
function squashError(e: unknown): string {
  if (e == null) return '';
  if (typeof e === 'string') return e.replace(/\s+/g, ' ').trim();
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m.replace(/\s+/g, ' ').trim();
  }
  try {
    return JSON.stringify(e).replace(/\s+/g, ' ').trim();
  } catch {
    return String(e);
  }
}

function truncateOneLine(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function truncateWholeHint(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

type ChannelRow = { sortKey: string; label: string; block: Record<string, unknown> };

function collectChannelRows(audit: Record<string, unknown>): ChannelRow[] {
  const byLabel = new Map<string, ChannelRow>();

  const ingest = (rawKey: string, block: Record<string, unknown>) => {
    const label = labelForChannelKey(rawKey);
    const prev = byLabel.get(label);
    const merged = prev
      ? {
          sortKey: prev.sortKey,
          label,
          block: mergeChannelBlocks(prev.block, block),
        }
      : {
          sortKey: normalizeChannelKey(rawKey),
          label,
          block,
        };
    byLabel.set(label, merged);
  };

  const ch = audit.channels;
  if (ch && typeof ch === 'object' && !Array.isArray(ch)) {
    for (const [k, v] of Object.entries(ch as Record<string, unknown>)) {
      if (isPlainObject(v)) ingest(k, v);
    }
  }

  const skipTop = new Set([
    'channels',
    'title',
    'summary',
    'label',
    'hint',
    'live_sensor_audit',
    'result',
    'meta',
    'metadata',
  ]);

  for (const [k, v] of Object.entries(audit)) {
    if (skipTop.has(k)) continue;
    if (isPlainObject(v) && 'ok' in v) ingest(k, v);
  }

  return Array.from(byLabel.values());
}

/** 第一行：本轮涉及的 MCP 类型（天气 · 住宿 · 租车） */
function buildMcpTypesLine(audit: Record<string, unknown>): string {
  const rows = collectChannelRows(audit);
  if (rows.length === 0) return '';

  const priority = (label: string): number => {
    const order = ['天气', '住宿', '租车', '航班', '餐饮', '景点', '路况'];
    const i = order.indexOf(label);
    return i === -1 ? 100 + label.charCodeAt(0) : i;
  };

  rows.sort((a, b) => {
    const pa = priority(a.label);
    const pb = priority(b.label);
    if (pa !== pb) return pa - pb;
    return a.sortKey.localeCompare(b.sortKey);
  });

  const labels = rows.map((r) => r.label);
  return [...new Set(labels)].join(' · ');
}

/**
 * 第二行：仅 ok === false 的失败项（最多 4 条）
 */
function buildFailuresLine(audit: Record<string, unknown>): string {
  const rows = collectChannelRows(audit);
  const parts: string[] = [];

  for (const row of rows) {
    if (row.block.ok !== false) continue;
    const errRaw = row.block.error ?? row.block.err ?? row.block.message;
    const msg = squashError(errRaw);
    const short = msg ? truncateOneLine(msg, MAX_ERROR_CHARS) : '未返回详情';
    parts.push(`${row.label}: ${short}`);
    if (parts.length >= MAX_FAILURE_ITEMS) break;
  }

  if (parts.length === 0) return '';
  return `失败 · ${parts.join(' · ')}`;
}

/**
 * 组装完整 hint（含 \\n），总长不超过 220。
 */
export function buildLiveSensorAuditHint(audit: Record<string, unknown>): string {
  const fromChannels = buildMcpTypesLine(audit);
  const line1 =
    fromChannels ||
    (typeof audit.summary === 'string' && audit.summary.trim()) ||
    (typeof audit.title === 'string' && audit.title.trim()) ||
    (typeof audit.label === 'string' && audit.label.trim()) ||
    '';

  const line2 = buildFailuresLine(audit);

  let hint = line1;
  if (line2) {
    hint = line1 ? `${line1}\n${line2}` : line2;
  }

  return truncateWholeHint(hint, MAX_HINT_CHARS);
}
