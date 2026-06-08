/**
 * `POST /api/agent/route_and_run` → `result.payload.safety_surface`（version 1.0）
 * 与行程时间轴对齐：以 `route_segment_ref` 为主键，叠「痛觉」类徽章；勿从 answer_text 解析。
 */

import { extractItineraryItemId } from '@/lib/agent-itinerary-item-display';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function pickStr(o: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** 后端稳定结构 v1.0（字段按需宽松，避免装配器小幅漂移即挂） */
export interface SafetySurfaceTaggedDriveLegV1 {
  day: number;
  item_id: string;
  route_segment_ref: string;
  label: string;
}

export interface SafetySurfaceSafetravelAlertV1 {
  summary?: string;
  affected_route_segment_refs?: string[];
}

export interface SafetySurfaceVerifyIssueV1 {
  segment_ref?: string;
  message?: string;
  suggestion?: string;
  headline_zh?: string;
  code?: string;
}

export interface SafetySurfaceSmartUpdateV1 {
  narrative?: string;
  reachability_messages?: string[];
  adjustments?: unknown;
  applied_fixes?: unknown;
}

export interface SafetySurfacePayloadV1 {
  version?: string;
  safetravel_route_alerts?: SafetySurfaceSafetravelAlertV1[];
  verify_issues?: SafetySurfaceVerifyIssueV1[];
  smart_update?: SafetySurfaceSmartUpdateV1;
  tagged_drive_legs?: SafetySurfaceTaggedDriveLegV1[];
}

export type SafetyBadgeTone = 'muted' | 'warning';

export interface SafetyItemBadgeV1 {
  key: string;
  label: string;
  tone?: SafetyBadgeTone;
}

export interface SafetyItemDetailBlockV1 {
  title: string;
  lines: string[];
}

/** 单条 timeline 行可挂载的 UI 数据 */
export interface SafetyItemUiV1 {
  segmentRef?: string;
  badges: SafetyItemBadgeV1[];
  detailBlocks: SafetyItemDetailBlockV1[];
}

type SegmentRollup = {
  alertSummaries: string[];
  verifyIssues: SafetySurfaceVerifyIssueV1[];
  driveLabels: string[];
};

function normalizeSegmentRef(s: string): string {
  return s.trim();
}

function indexSafetySurface(surface: SafetySurfacePayloadV1): Map<string, SegmentRollup> {
  const map = new Map<string, SegmentRollup>();
  const touch = (ref: string): SegmentRollup => {
    const k = normalizeSegmentRef(ref);
    let r = map.get(k);
    if (!r) {
      r = { alertSummaries: [], verifyIssues: [], driveLabels: [] };
      map.set(k, r);
    }
    return r;
  };

  for (const a of surface.safetravel_route_alerts ?? []) {
    const sum = typeof a.summary === 'string' ? a.summary.trim() : '';
    const refs = Array.isArray(a.affected_route_segment_refs)
      ? a.affected_route_segment_refs.map((x) => String(x).trim()).filter(Boolean)
      : [];
    for (const ref of refs) {
      const r = touch(ref);
      if (sum && !r.alertSummaries.includes(sum)) r.alertSummaries.push(sum);
    }
  }

  for (const v of surface.verify_issues ?? []) {
    const seg = typeof v.segment_ref === 'string' ? v.segment_ref.trim() : '';
    if (!seg) continue;
    touch(seg).verifyIssues.push(v);
  }

  for (const leg of surface.tagged_drive_legs ?? []) {
    const ref = typeof leg.route_segment_ref === 'string' ? leg.route_segment_ref.trim() : '';
    if (!ref) continue;
    const label = typeof leg.label === 'string' ? leg.label.trim() : '';
    const r = touch(ref);
    if (label && !r.driveLabels.includes(label)) r.driveLabels.push(label);
  }

  return map;
}

function segmentRefFromTaggedLeg(
  legs: SafetySurfaceTaggedDriveLegV1[] | undefined,
  dayIndex: number,
  itemId: string | undefined
): string | undefined {
  if (!legs?.length || !itemId?.trim()) return undefined;
  const id = itemId.trim();
  const matches = legs.filter((l) => String(l.item_id ?? '').trim() === id);
  if (matches.length === 0) return undefined;
  const byDay =
    matches.find((l) => l.day === dayIndex + 1) ??
    matches.find((l) => l.day === dayIndex) ??
    matches[0];
  const ref = String(byDay?.route_segment_ref ?? '').trim();
  return ref || undefined;
}

function rollupToItemUi(segmentRef: string, rollup: SegmentRollup): SafetyItemUiV1 {
  const badges: SafetyItemBadgeV1[] = [];
  const detailBlocks: SafetyItemDetailBlockV1[] = [];

  if (rollup.verifyIssues.length > 0) {
    badges.push({ key: 'verify', label: '校验', tone: 'warning' });
    const lines: string[] = [];
    for (const v of rollup.verifyIssues) {
      const parts = [v.message, v.suggestion].filter((x) => typeof x === 'string' && x.trim()) as string[];
      if (parts.length) lines.push(parts.join(' — '));
    }
    if (lines.length) detailBlocks.push({ title: '校验', lines });
  }

  if (rollup.alertSummaries.length > 0) {
    badges.push({ key: 'safetravel', label: '路况', tone: 'warning' });
    detailBlocks.push({ title: 'SafeTravel', lines: [...rollup.alertSummaries] });
  }

  for (const lab of rollup.driveLabels) {
    badges.push({ key: `tag-${lab}`, label: lab, tone: 'muted' });
  }

  return { segmentRef, badges, detailBlocks };
}

/**
 * 从 `result.payload`（或任意 record）解析 `safety_surface` / `safetySurface`。
 */
export function parseSafetySurfacePayload(payload: unknown): SafetySurfacePayloadV1 | null {
  const rec = asRecord(payload);
  if (!rec) return null;
  const raw = rec.safety_surface ?? rec.safetySurface;
  const o = asRecord(raw);
  if (!o) return null;

  const tagged = Array.isArray(o.tagged_drive_legs)
    ? (o.tagged_drive_legs as unknown[]).map((x) => {
        const r = asRecord(x);
        if (!r) return null;
        return {
          day: typeof r.day === 'number' ? r.day : Number(r.day) || 0,
          item_id: String(r.item_id ?? r.itemId ?? '').trim(),
          route_segment_ref: String(r.route_segment_ref ?? r.routeSegmentRef ?? '').trim(),
          label: String(r.label ?? '').trim(),
        } as SafetySurfaceTaggedDriveLegV1;
      }).filter(Boolean) as SafetySurfaceTaggedDriveLegV1[]
    : undefined;

  const alerts = Array.isArray(o.safetravel_route_alerts)
    ? (o.safetravel_route_alerts as unknown[]).map((x) => {
        const r = asRecord(x);
        if (!r) return { summary: '', affected_route_segment_refs: [] };
        const refsRaw = r.affected_route_segment_refs ?? r.affectedRouteSegmentRefs;
        const refs = Array.isArray(refsRaw)
          ? refsRaw.map((u) => String(u).trim()).filter(Boolean)
          : [];
        return {
          summary: typeof r.summary === 'string' ? r.summary.trim() : '',
          affected_route_segment_refs: refs,
        };
      })
    : undefined;

  const verify = Array.isArray(o.verify_issues)
    ? (o.verify_issues as unknown[]).map((x) => {
        const r = asRecord(x);
        if (!r) return {};
        return {
          segment_ref: pickStr(r, 'segment_ref', 'segmentRef'),
          message: pickStr(r, 'message', 'msg', 'text'),
          suggestion: pickStr(r, 'suggestion', 'suggest', 'fix'),
        } as SafetySurfaceVerifyIssueV1;
      })
    : undefined;

  const suRaw = o.smart_update ?? o.smartUpdate;
  const su = asRecord(suRaw);
  const smart_update = su
    ? ({
        narrative: pickStr(su, 'narrative', 'summary'),
        reachability_messages: Array.isArray(su.reachability_messages)
          ? (su.reachability_messages as unknown[]).map((x) => String(x).trim()).filter(Boolean)
          : Array.isArray(su.reachabilityMessages)
            ? (su.reachabilityMessages as unknown[]).map((x) => String(x).trim()).filter(Boolean)
            : undefined,
        adjustments: su.adjustments,
        applied_fixes: su.applied_fixes ?? su.appliedFixes,
      } as SafetySurfaceSmartUpdateV1)
    : undefined;

  const out: SafetySurfacePayloadV1 = {
    version: typeof o.version === 'string' ? o.version : '1.0',
    ...(tagged?.length ? { tagged_drive_legs: tagged } : {}),
    ...(alerts?.length ? { safetravel_route_alerts: alerts } : {}),
    ...(verify?.length ? { verify_issues: verify } : {}),
    ...(smart_update && Object.keys(smart_update).length ? { smart_update } : {}),
  };

  const hasAny =
    (out.tagged_drive_legs?.length ?? 0) > 0 ||
    (out.safetravel_route_alerts?.length ?? 0) > 0 ||
    (out.verify_issues?.length ?? 0) > 0 ||
    Boolean(out.smart_update && (out.smart_update.narrative || (out.smart_update.reachability_messages?.length ?? 0)));

  return hasAny ? out : null;
}

export function safetySurfaceHasRenderableSurface(s: SafetySurfacePayloadV1 | null | undefined): boolean {
  if (!s) return false;
  return (
    (s.tagged_drive_legs?.length ?? 0) > 0 ||
    (s.safetravel_route_alerts?.length ?? 0) > 0 ||
    (s.verify_issues?.length ?? 0) > 0 ||
    Boolean(s.smart_update?.narrative?.trim()) ||
    Boolean((s.smart_update?.reachability_messages?.length ?? 0) > 0)
  );
}

/** 摘要行：优先 narrative，否则 reachability_messages */
export function safetySurfaceSmartUpdateSummaryLine(s: SafetySurfacePayloadV1 | null | undefined): string | null {
  if (!s?.smart_update) return null;
  const n = s.smart_update.narrative?.trim();
  if (n) return n;
  const r = s.smart_update.reachability_messages?.filter(Boolean) ?? [];
  if (r.length) return r.join(' · ');
  return null;
}

function formatJsonSnippet(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  try {
    const s = JSON.stringify(v);
    return s.length > 400 ? `${s.slice(0, 400)}…` : s;
  } catch {
    return String(v);
  }
}

/** smart_update 处方 / 动作用于折叠块（全局，不按 segment） */
export function safetySurfaceSmartUpdateActionLines(s: SafetySurfacePayloadV1 | null | undefined): string[] {
  const su = s?.smart_update;
  if (!su) return [];
  const lines: string[] = [];
  const adj = formatJsonSnippet(su.adjustments);
  const fix = formatJsonSnippet(su.applied_fixes);
  if (adj) lines.push(`adjustments: ${adj}`);
  if (fix) lines.push(`applied_fixes: ${fix}`);
  return lines;
}

/**
 * 为 timeline 单行解析安全徽章与详情（依赖 `safety_surface` + 条目上可选 `route_segment_ref`）。
 */
export function resolveSafetyItemUi(
  surface: SafetySurfacePayloadV1 | null | undefined,
  dayIndex: number,
  rawItem: unknown
): SafetyItemUiV1 | null {
  if (!surface) return null;
  const map = indexSafetySurface(surface);
  if (map.size === 0 && !(surface.tagged_drive_legs?.length ?? 0)) return null;

  const o = asRecord(rawItem);
  const fromItem =
    o &&
    pickStr(o, 'route_segment_ref', 'routeSegmentRef', 'route_segment_ref_id', 'routeSegmentRefId');
  const itemId = extractItineraryItemId(rawItem);
  const fromTagged = segmentRefFromTaggedLeg(surface.tagged_drive_legs, dayIndex, itemId);
  const segmentRef = (fromItem && normalizeSegmentRef(fromItem)) || fromTagged;
  if (!segmentRef) return null;

  const rollup = map.get(normalizeSegmentRef(segmentRef));
  if (!rollup || (rollup.alertSummaries.length === 0 && rollup.verifyIssues.length === 0 && rollup.driveLabels.length === 0)) {
    return null;
  }

  return rollupToItemUi(segmentRef, rollup);
}
