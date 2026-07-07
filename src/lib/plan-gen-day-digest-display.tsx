import type { DecisionLogEntry, PlanGenDayDigestEntry } from '@/api/agent';
import { sanitizeDecisionLogSummaryText } from '@/lib/decision-log-client-display';

export type { PlanGenDayDigestEntry };

const ISO_DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}/;
const LOOSE_DATE_KEY_RE = /^\d{1,2}\/\d{1,2}/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickDayNumber(entry: Record<string, unknown>): number | undefined {
  const raw = entry.day_number ?? entry.dayNumber ?? entry.day ?? entry.index;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw.trim());
  return undefined;
}

function pickDateIso(entry: Record<string, unknown>): string | undefined {
  const raw =
    entry.date_iso ??
    entry.dateIso ??
    entry.date ??
    entry.target_date_iso ??
    entry.targetDateIso;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const t = raw.trim();
  return t.includes('T') ? t.split('T')[0] : t;
}

function pickOutputsSummary(entry: Record<string, unknown>): string {
  const candidates = [
    entry.outputs_summary,
    entry.outputsSummary,
    entry.output_summary,
    entry.outputSummary,
    entry.summary_zh,
    entry.summaryZh,
    entry.day_summary_zh,
    entry.daySummaryZh,
    entry.summary,
    entry.output,
    entry.output_zh,
    entry.outputZh,
    entry.text,
    entry.description,
    entry.content,
    entry.body,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

function pickInputsSummary(entry: Record<string, unknown>): string {
  const candidates = [entry.inputs_summary, entry.inputsSummary, entry.input_summary, entry.inputSummary];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

function normalizePlanGenDayDigestEntry(
  raw: unknown,
  opts?: { dayNumber?: number; dateIso?: string }
): PlanGenDayDigestEntry | null {
  if (typeof raw === 'string' && raw.trim()) {
    const t = raw.trim();
    if (ISO_DATE_KEY_RE.test(t) || LOOSE_DATE_KEY_RE.test(t)) {
      const dateIso = t.includes('T') ? t.split('T')[0] : t;
      return {
        ...(opts?.dayNumber != null ? { day_number: opts.dayNumber } : {}),
        date_iso: dateIso,
      };
    }
    return {
      ...(opts?.dayNumber != null ? { day_number: opts.dayNumber } : {}),
      ...(opts?.dateIso ? { date_iso: opts.dateIso } : {}),
      outputs_summary: sanitizeDecisionLogSummaryText(t),
    };
  }

  if (!isRecord(raw)) return null;

  const outputs = pickOutputsSummary(raw);
  const inputs = pickInputsSummary(raw);
  const dayNumber = pickDayNumber(raw) ?? opts?.dayNumber;
  const dateIso = pickDateIso(raw) ?? opts?.dateIso;

  if (!outputs && !inputs && dayNumber == null && !dateIso) return null;

  return {
    ...(dayNumber != null ? { day_number: dayNumber } : {}),
    ...(dateIso ? { date_iso: dateIso } : {}),
    ...(outputs ? { outputs_summary: sanitizeDecisionLogSummaryText(outputs) } : {}),
    ...(inputs ? { inputs_summary: sanitizeDecisionLogSummaryText(inputs) } : {}),
  };
}

function parseDateKeyedDigestMap(raw: Record<string, unknown>): PlanGenDayDigestEntry[] {
  const reserved = new Set(['days', 'day_digest', 'dayDigest', 'items']);
  const out: PlanGenDayDigestEntry[] = [];
  let idx = 0;
  for (const [key, val] of Object.entries(raw)) {
    if (reserved.has(key)) continue;
    if (!ISO_DATE_KEY_RE.test(key) && !LOOSE_DATE_KEY_RE.test(key)) continue;
    idx += 1;
    const dateIso = key.includes('T') ? key.split('T')[0] : key;
    const entry =
      normalizePlanGenDayDigestEntry(val, { dayNumber: idx, dateIso }) ??
      (typeof val === 'string'
        ? normalizePlanGenDayDigestEntry(val, { dayNumber: idx, dateIso })
        : null);
    if (entry) out.push(entry);
  }
  return out;
}

/** 从 metadata 解析按天 digest（数组 / 日期键对象 / `{ days: [] }`） */
export function pickPlanGenDayDigest(
  metadata: DecisionLogEntry['metadata'] | undefined
): PlanGenDayDigestEntry[] {
  if (!metadata) return [];
  const raw =
    (metadata as { plan_gen_day_digest?: unknown }).plan_gen_day_digest ??
    (metadata as { planGenDayDigest?: unknown }).planGenDayDigest;

  if (Array.isArray(raw)) {
    return raw
      .map((item, idx) =>
        normalizePlanGenDayDigestEntry(item, {
          dayNumber: idx + 1,
          ...(typeof item === 'string' && ISO_DATE_KEY_RE.test(item.trim())
            ? { dateIso: item.trim().split('T')[0] }
            : {}),
        })
      )
      .filter((d): d is PlanGenDayDigestEntry => d != null);
  }

  if (isRecord(raw)) {
    const nested = raw.days ?? raw.day_digest ?? raw.dayDigest ?? raw.items;
    if (Array.isArray(nested)) {
      return nested
        .map((item, idx) => normalizePlanGenDayDigestEntry(item, { dayNumber: idx + 1 }))
        .filter((d): d is PlanGenDayDigestEntry => d != null);
    }
    const dateKeyed = parseDateKeyedDigestMap(raw);
    if (dateKeyed.length > 0) return dateKeyed;
  }

  return [];
}

export interface ParsedDayLineFromOutputsSummary {
  dayNumber: number;
  dateHint?: string;
  content: string;
}

function cleanParsedDayContent(content: string): string {
  return content
    .replace(/[。；;]\s*其余[\s\S]*$/u, '')
    .replace(/\s*其余\s*\d+\s*天[\s\S]*$/u, '')
    .replace(/[。；;]\s*$/u, '')
    .trim();
}

function upsertParsedDayLine(
  lines: ParsedDayLineFromOutputsSummary[],
  entry: ParsedDayLineFromOutputsSummary
): void {
  if (!entry.content) return;
  const idx = lines.findIndex((l) => l.dayNumber === entry.dayNumber);
  if (idx >= 0) {
    if (!lines[idx].content) lines[idx] = entry;
    return;
  }
  lines.push(entry);
}

/** 从顶层 outputs_summary 拆出按天摘要（BFF 仅补日期时的前端兜底） */
export function parseDayLinesFromOutputsSummary(text: string): ParsedDayLineFromOutputsSummary[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines: ParsedDayLineFromOutputsSummary[] = [];

  // 正文列表：第1天(11/1)：…
  const chunks = trimmed.split(/(?=第\s*\d+\s*天)/).filter(Boolean);
  for (const chunk of chunks) {
    const m = chunk.match(
      /^第\s*(\d+)\s*天\s*(?:[（(]([^)）]+)[)）])?\s*[：:]\s*([\s\S]+)$/
    );
    if (!m) continue;
    const content = cleanParsedDayContent(m[3].trim());
    if (!content) continue;
    upsertParsedDayLine(lines, {
      dayNumber: Number(m[1]),
      ...(m[2]?.trim() ? { dateHint: m[2].trim() } : {}),
      content,
    });
  }

  // 导语内单天：第 6 天 (11/6) 按邻日走廊重算：…
  const introRe =
    /第\s*(\d+)\s*天\s*[（(]([^)）]+)[)）]\s*[^：:\n]*[：:]\s*([^。；;\n]+)/g;
  let introMatch: RegExpExecArray | null;
  while ((introMatch = introRe.exec(trimmed)) !== null) {
    const content = cleanParsedDayContent(introMatch[3].trim());
    if (!content) continue;
    upsertParsedDayLine(lines, {
      dayNumber: Number(introMatch[1]),
      dateHint: introMatch[2].trim(),
      content,
    });
  }

  return lines.sort((a, b) => a.dayNumber - b.dayNumber);
}

function looseDateHintMatchesIso(hint: string | undefined, dateIso: string | undefined): boolean {
  if (!hint?.trim() || !dateIso?.trim()) return false;
  const h = hint.trim();
  if (ISO_DATE_KEY_RE.test(h)) {
    const a = h.includes('T') ? h.split('T')[0] : h;
    const b = dateIso.includes('T') ? dateIso.split('T')[0] : dateIso;
    return a === b;
  }
  const m = h.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return false;
  const iso = dateIso.includes('T') ? dateIso.split('T')[0] : dateIso;
  const parts = iso.split('-');
  if (parts.length !== 3) return false;
  return Number(parts[1]) === Number(m[1]) && Number(parts[2]) === Number(m[2]);
}

function findParsedLineForDigestDay(
  parsed: ParsedDayLineFromOutputsSummary[],
  day: PlanGenDayDigestEntry
): string | undefined {
  const byNumber = parsed.find((p) => day.day_number != null && p.dayNumber === day.day_number);
  if (byNumber?.content) return byNumber.content;

  if (day.date_iso) {
    const byDate = parsed.find(
      (p) =>
        looseDateHintMatchesIso(p.dateHint, day.date_iso) ||
        (p.dateHint && day.date_iso.includes(p.dateHint))
    );
    if (byDate?.content) return byDate.content;
  }

  return undefined;
}

/** 用顶层 outputs_summary 补全仅有日期、无当日摘要的 digest 行 */
export function enrichPlanGenDayDigestFromOutputsSummary(
  days: PlanGenDayDigestEntry[],
  outputsSummary?: string | null
): PlanGenDayDigestEntry[] {
  if (!days.length || !outputsSummary?.trim()) return days;
  const parsed = parseDayLinesFromOutputsSummary(outputsSummary);
  if (!parsed.length) return days;

  return days.map((day) => {
    if (day.outputs_summary?.trim() || day.inputs_summary?.trim()) return day;
    const content = findParsedLineForDigestDay(parsed, day);
    if (!content) return day;
    return {
      ...day,
      outputs_summary: sanitizeDecisionLogSummaryText(content),
    };
  });
}

export function planGenDayDigestHasRenderableContent(day: PlanGenDayDigestEntry): boolean {
  return Boolean(day.outputs_summary?.trim() || day.inputs_summary?.trim());
}

export function planGenDayDigestDayLabel(entry: PlanGenDayDigestEntry): string {
  const day = entry.day_number;
  const date = entry.date_iso;
  if (day != null && date) return `第 ${day} 天 (${date})`;
  if (day != null) return `第 ${day} 天`;
  if (date) return date;
  return '当日';
}

/** PLAN_GEN 等步骤：按天明细折叠区（主文案仍用顶层 outputs_summary / inputs_summary） */
export function PlanGenDayDigestExtras({ log }: { log: DecisionLogEntry }) {
  const rawDays = pickPlanGenDayDigest(log.metadata);
  const days = enrichPlanGenDayDigestFromOutputsSummary(rawDays, log.outputs_summary).filter(
    planGenDayDigestHasRenderableContent
  );
  if (!days.length) return null;

  return (
    <details className="mt-1 rounded-md border border-border/90 bg-muted/20 text-[11px] dark:border-border/40">
      <summary className="cursor-pointer px-2 py-1.5 font-medium text-muted-foreground select-none hover:text-foreground">
        按天明细 ({days.length} 天)
      </summary>
      <ul className="border-t border-border/50 px-2 py-2 space-y-2">
        {days.map((day, idx) => (
          <li key={`${day.date_iso ?? ''}-${day.day_number ?? idx}`} className="space-y-0.5">
            <p className="font-medium text-foreground/90">{planGenDayDigestDayLabel(day)}</p>
            {day.outputs_summary ? (
              <p className="text-foreground/85 leading-relaxed whitespace-pre-wrap">{day.outputs_summary}</p>
            ) : null}
            {day.inputs_summary ? (
              <p className="text-muted-foreground">输入：{day.inputs_summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
