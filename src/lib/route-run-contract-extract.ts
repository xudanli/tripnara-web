/**
 * route_and_run 契约层抽取：narration、simplified_explanation、VERIFY issues、稀疏 POI 草案等。
 * 与 answer_text 解耦，供气泡并列展示。
 */

import type {
  DecisionLogEntry,
  OrchestrationResult,
  RouteRunSimplifiedExplanation,
  VerifyIssue,
  VerifyIssueSeverityClass,
} from '@/api/agent';
import type { AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import { stripAuditTags, stripL3Proof } from '@/lib/clarification-surface';
import type { SafetySurfacePayloadV1 } from '@/lib/safety-surface-payload';
import { sanitizeRouteRunAnswerTextForDisplay } from '@/lib/route-run-answer-text-display';
import {
  collectTimelinePoiSchedules,
  formatHmInDestinationTimezone,
  hasUsableOpeningHours,
  isOpenAtScheduledTime,
  mergePoiScheduleSources,
  parsePoiClosedIssueMessage,
  poiNamesMatch,
  type TimelinePoiScheduleContext,
} from '@/utils/opening-hours-schedule-check';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

export type OrchestrationNarrationSlice = {
  user_friendly_summary?: string;
  /** 按日叙述正文（中文），优先于结构化 day_by_day_narrative 展示 */
  day_by_day_text_zh?: string;
  day_by_day_narrative?: unknown;
  tips?: unknown;
  warnings?: unknown;
};

/** 从 answer_text 抽「按日」块：以「第N天 / Day N / yyyy年mm月dd日」等标题行为界 */
export function extractDayByDayParagraphsFromAnswerText(raw: string): string | null {
  const text = sanitizeRouteRunAnswerTextForDisplay(typeof raw === 'string' ? raw : '');
  if (!text.trim()) return null;

  const lineLooksLikeDayTitle = (line: string): boolean => {
    const deco = line
      .replace(/^\s+/, '')
      .replace(/^([*_`])+/, '')
      .replace(/^#+\s*/, '')
      .trim();
    return (
      /^第\s*(?:[一二三四五六七八九十百千万]+|\d+)\s*天/u.test(deco) ||
      /^Day\s*\d+\b/i.test(deco) ||
      /^([12]?\d{3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/u.test(deco)
    );
  };

  const lines = text.split('\n');
  const chunks: string[] = [];
  let cur: string[] = [];
  for (const line of lines) {
    if (lineLooksLikeDayTitle(line)) {
      if (cur.length) {
        const block = cur.join('\n').trim();
        if (block) chunks.push(block);
      }
      cur = [line];
    } else if (cur.length) {
      cur.push(line);
    }
  }
  if (cur.length) {
    const block = cur.join('\n').trim();
    if (block) chunks.push(block);
  }
  if (chunks.length === 0) return null;
  const joined = chunks.join('\n\n');
  if (chunks.length === 1 && joined.replace(/\s/g, '').length < 24) return null;
  return joined;
}

export function extractOrchestrationNarration(
  orch: OrchestrationResult | null | undefined
): OrchestrationNarrationSlice | null {
  const state = asRecord(orch?.state);
  const n = state ? asRecord(state.narration) : undefined;
  if (!n) return null;
  const out: OrchestrationNarrationSlice = {};
  const ufs = n.user_friendly_summary ?? n.userFriendlySummary;
  if (typeof ufs === 'string' && ufs.trim()) out.user_friendly_summary = ufs.trim();
  const dbz = n.day_by_day_text_zh ?? n.dayByDayTextZh;
  if (typeof dbz === 'string' && dbz.trim()) out.day_by_day_text_zh = dbz.trim();
  const dbb = n.day_by_day_narrative ?? n.dayByDayNarrative;
  if (dbb != null) out.day_by_day_narrative = dbb;
  if (n.tips != null) out.tips = n.tips;
  if (n.warnings != null) out.warnings = n.warnings;
  if (
    !out.user_friendly_summary &&
    !out.day_by_day_text_zh &&
    out.day_by_day_narrative == null &&
    out.tips == null &&
    out.warnings == null
  ) {
    return null;
  }
  return out;
}

export function pickSimplifiedExplanationFromExplain(
  explain: { simplified_explanation?: unknown } | null | undefined
): RouteRunSimplifiedExplanation | null {
  const raw = explain?.simplified_explanation;
  const o = asRecord(raw);
  if (!o) return null;
  const summary =
    typeof o.summary === 'string' && o.summary.trim() ? o.summary.trim() : undefined;
  const kd = o.key_decisions ?? o.keyDecisions;
  if (!summary && kd == null) return null;
  return { summary, key_decisions: kd };
}

function normalizeVerifyIssueClass(raw: unknown): VerifyIssueSeverityClass {
  const s = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (s === 'CONFLICT') return 'CONFLICT';
  if (s === 'ADVISORY') return 'ADVISORY';
  return s || 'ADVISORY';
}

function mergeDecisionLogDedupKey(e: DecisionLogEntry): string {
  const step = String(e.step ?? '').toUpperCase();
  const ts = e.timestamp ?? '';
  const sum = e.outputs_summary ?? '';
  if (step === 'HALLUCINATION_DETECTION') {
    return `${ts}|${step}|${sum.length}|${sum}`;
  }
  return `${ts}|${step}|${sum.slice(0, 120)}`;
}

/** 合并顶层 decision_log 与编排内 decision_log（去重：同一 timestamp+step+outputs_summary 只保留一条） */
export function mergeRouteRunDecisionLogs(
  topLevel?: DecisionLogEntry[] | null,
  fromOrch?: DecisionLogEntry[] | null
): DecisionLogEntry[] {
  const merged = [...(topLevel ?? []), ...(fromOrch ?? [])];
  if (merged.length <= 1) return merged;
  const seen = new Set<string>();
  const out: DecisionLogEntry[] = [];
  for (const e of merged) {
    const key = mergeDecisionLogDedupKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export function extractVerifyIssuesFromDecisionLog(decisionLog: DecisionLogEntry[]): VerifyIssue[] {
  const out: VerifyIssue[] = [];
  for (const entry of decisionLog) {
    const step = String(entry.step ?? '').toUpperCase();
    if (step !== 'VERIFY') continue;
    const md = asRecord(entry.metadata);
    const issues = md?.issues;
    if (!Array.isArray(issues)) continue;
    for (const raw of issues) {
      const r = asRecord(raw);
      if (!r) continue;
      const cls = normalizeVerifyIssueClass(r.class ?? r.severity);
      const code =
        typeof r.code === 'string'
          ? r.code
          : typeof r.issue_code === 'string'
            ? r.issue_code
            : typeof r.kind === 'string'
              ? r.kind
              : undefined;
      const displayMessageZh =
        typeof r.display_message_zh === 'string'
          ? r.display_message_zh.trim()
          : typeof r.displayMessageZh === 'string'
            ? r.displayMessageZh.trim()
            : undefined;
      const message =
        displayMessageZh ||
        (typeof r.message === 'string'
          ? r.message
          : typeof r.detail === 'string'
            ? r.detail
            : typeof r.title === 'string'
              ? r.title
              : undefined);
      if (!message?.trim() && !code?.trim()) continue;
      const classLabelZh =
        typeof r.class_label_zh === 'string'
          ? r.class_label_zh.trim()
          : typeof r.classLabelZh === 'string'
            ? r.classLabelZh.trim()
            : undefined;
      const codeLabelZh =
        typeof r.code_label_zh === 'string'
          ? r.code_label_zh.trim()
          : typeof r.codeLabelZh === 'string'
            ? r.codeLabelZh.trim()
            : undefined;
      out.push({
        ...r,
        class: cls,
        code,
        message: message?.trim() || code,
        ...(displayMessageZh ? { display_message_zh: displayMessageZh } : {}),
        ...(classLabelZh ? { class_label_zh: classLabelZh } : {}),
        ...(codeLabelZh ? { code_label_zh: codeLabelZh } : {}),
      });
    }
  }
  return out;
}

function pickStr(o: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function verifyIssueDedupKey(issue: VerifyIssue): string {
  const code = (issue.code ?? '').trim().toUpperCase();
  const display = advisoryIssueDisplayText(issue);
  const { poiName, checkTime } = parsePoiClosedIssueMessage(display);
  if (code === 'POI_CLOSED' && poiName) {
    return `${issue.class ?? ''}|${code}|${poiName}|${checkTime ?? ''}`;
  }
  return `${issue.class ?? ''}|${code}|${display}`;
}

function dedupeVerifyIssues(issues: VerifyIssue[]): VerifyIssue[] {
  const seen = new Set<string>();
  const out: VerifyIssue[] = [];
  for (const issue of issues) {
    const key = verifyIssueDedupKey(issue);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

function enrichPoiClosedIssueWithTimeline(
  issue: VerifyIssue,
  schedules: TimelinePoiScheduleContext[],
  timezone: string
): VerifyIssue {
  const text = advisoryIssueDisplayText(issue);
  const { poiName } = parsePoiClosedIssueMessage(text);
  if (!poiName) return issue;

  const matches = schedules.filter((s) => poiNamesMatch(s.name, poiName));
  const withWindow = matches.find((s) => s.startWindow?.trim());
  if (!withWindow?.startWindow) return issue;

  const actualHm = formatHmInDestinationTimezone(withWindow.startWindow, timezone);
  if (!actualHm) return issue;

  const updated = text.replace(/在\s*\d{1,2}:\d{2}/, `在 ${actualHm}`);
  if (updated === text) return issue;

  return {
    ...issue,
    message: updated,
    display_message_zh: updated,
  };
}

function shouldSuppressPoiClosedIssue(
  issue: VerifyIssue,
  schedules: TimelinePoiScheduleContext[],
  timezone: string
): boolean {
  const text = advisoryIssueDisplayText(issue);
  const { poiName } = parsePoiClosedIssueMessage(text);
  if (!poiName) return false;

  const matches = schedules.filter((s) => poiNamesMatch(s.name, poiName));
  const withHours = matches.filter((s) => hasUsableOpeningHours(s.rawOpeningHours));
  if (!withHours.length) return false;

  return withHours.every((m) => {
    const open = isOpenAtScheduledTime({
      rawOpeningHours: m.rawOpeningHours,
      visitStartIso: m.startWindow,
      visitEndIso: m.endWindow,
      timezone,
      businessStatus: m.businessStatus,
    });
    return open === true;
  });
}

function reconcilePoiClosedVerifyIssues(
  issues: VerifyIssue[],
  options: {
    timelineDayBlocks?: ItineraryDayItemsBlock[] | null;
    tripPoiSchedules?: TimelinePoiScheduleContext[] | null;
    timezone?: string;
  }
): VerifyIssue[] {
  if (!issues.length) return issues;
  const timezone = options.timezone?.trim() || 'UTC';
  const timelineSchedules = collectTimelinePoiSchedules(options.timelineDayBlocks ?? undefined);
  const tripSchedules = options.tripPoiSchedules ?? [];
  const schedules = mergePoiScheduleSources(tripSchedules, timelineSchedules);
  if (!schedules.length) return dedupeVerifyIssues(issues);

  const reconciled = issues
    .map((issue) => {
      const code = (issue.code ?? '').trim().toUpperCase();
      if (code !== 'POI_CLOSED') return issue;
      return enrichPoiClosedIssueWithTimeline(issue, schedules, timezone);
    })
    .filter((issue) => {
      const code = (issue.code ?? '').trim().toUpperCase();
      if (code !== 'POI_CLOSED') return true;
      return !shouldSuppressPoiClosedIssue(issue, schedules, timezone);
    });

  return dedupeVerifyIssues(reconciled);
}

/**
 * 可执行性问题：优先同轮 payload 的 gate_result.violations + safety_surface.verify_issues；
 * 勿与 GET trip 或上一轮 orchestrationResult 混用。
 */
export function extractVerifyIssuesFromSamePayload(options: {
  orchestrationResult?: OrchestrationResult | null;
  safetySurface?: SafetySurfacePayloadV1 | null;
  decisionLog?: DecisionLogEntry[] | null;
  timelineDayBlocks?: ItineraryDayItemsBlock[] | null;
  tripPoiSchedules?: TimelinePoiScheduleContext[] | null;
  timezone?: string;
}): VerifyIssue[] {
  const out: VerifyIssue[] = [];
  const seen = new Set<string>();

  const push = (issue: VerifyIssue) => {
    const key = verifyIssueDedupKey(issue);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(issue);
  };

  const gate = asRecord(options.orchestrationResult?.gate_result as unknown);
  const violations = gate?.violations;
  if (Array.isArray(violations)) {
    for (const raw of violations) {
      const v = asRecord(raw);
      if (!v) continue;
      const severity = String(v.severity ?? '').toUpperCase();
      const cls: VerifyIssueSeverityClass =
        severity === 'HARD' || severity === 'CONFLICT' ? 'CONFLICT' : 'ADVISORY';
      const message =
        pickStr(v, 'detail', 'detail_zh', 'detailZh', 'message', 'explanation', 'display_headline_zh') ??
        pickStr(v, 'headline_zh', 'headlineZh');
      const code = pickStr(v, 'code', 'violation_code', 'violationCode');
      if (!message && !code) continue;
      push({
        class: cls,
        code,
        message: message ?? code,
        display_message_zh: pickStr(v, 'display_headline_zh', 'displayHeadlineZh', 'headline_zh'),
      });
    }
  }

  for (const v of options.safetySurface?.verify_issues ?? []) {
    const message = v.message?.trim() || v.headline_zh?.trim() || v.suggestion?.trim();
    const code = v.code?.trim();
    if (!message && !code) continue;
    push({
      class: 'ADVISORY',
      code,
      message: message ?? code,
      display_message_zh: v.headline_zh ?? v.message,
    });
  }

  const reconcileOpts = {
    timelineDayBlocks: options.timelineDayBlocks,
    tripPoiSchedules: options.tripPoiSchedules,
    timezone: options.timezone ?? 'UTC',
  };

  if (out.length > 0) {
    return reconcilePoiClosedVerifyIssues(out, reconcileOpts);
  }

  const mergedLog = mergeRouteRunDecisionLogs(
    options.decisionLog,
    options.orchestrationResult?.decision_log ?? null
  );
  return reconcilePoiClosedVerifyIssues(
    dedupeVerifyIssues(extractVerifyIssuesFromDecisionLog(mergedLog)),
    reconcileOpts
  );
}

function distinctPoiLabelsFromBlocks(
  poiCardsByDay?: AgentPoiDayBlock[] | null,
  timelineDayBlocks?: ItineraryDayItemsBlock[] | null
): Set<string> {
  const set = new Set<string>();
  for (const d of poiCardsByDay ?? []) {
    for (const c of d.cards ?? []) {
      const t = c.displayName?.trim();
      if (t) set.add(t);
    }
  }
  for (const day of timelineDayBlocks ?? []) {
    for (const item of day.items ?? []) {
      const o = item as Record<string, unknown>;
      const loc = asRecord(o.location_ref);
      const name =
        typeof loc?.name === 'string'
          ? loc.name.trim()
          : typeof o.title === 'string'
            ? o.title.trim()
            : typeof o.name === 'string'
              ? o.name.trim()
              : undefined;
      if (name) set.add(name);
    }
  }
  return set;
}

/** 多日行程但有效 POI 名称很少 → 草案级排期弱提示 */
export function detectRouteRunSparsePoiDraft(options: {
  poiCardsByDay?: AgentPoiDayBlock[] | null;
  timelineDayBlocks?: ItineraryDayItemsBlock[] | null;
}): boolean {
  const dayCount = Math.max(
    options.timelineDayBlocks?.filter((d) => (d.items?.length ?? 0) > 0).length ?? 0,
    options.poiCardsByDay?.length ?? 0
  );
  if (dayCount < 2) return false;
  const n = distinctPoiLabelsFromBlocks(options.poiCardsByDay, options.timelineDayBlocks).size;
  return n > 0 && n <= 2;
}

export function readNoPoiPlanningFromPayload(payload: Record<string, unknown> | undefined): boolean {
  if (!payload) return false;
  const meta = asRecord(payload.metadata);
  const direct = asRecord(payload.poiPlanningOutcome ?? payload.poi_planning_outcome);
  const nested = asRecord(meta?.poiPlanningOutcome ?? meta?.poi_planning_outcome);
  const o = direct ?? nested;
  if (!o) return false;
  return o.noPoiPlanning === true || o.no_poi_planning === true;
}

export function timelineEchoesVerifyIssueCodes(
  timelineDayBlocks: ItineraryDayItemsBlock[] | undefined,
  issueCodes: string[]
): boolean {
  if (!timelineDayBlocks?.length || !issueCodes.length) return false;
  const needles = issueCodes.map((c) => c.toUpperCase()).filter(Boolean);
  if (!needles.length) return false;
  for (const day of timelineDayBlocks) {
    for (const item of day.items ?? []) {
      const blob = JSON.stringify(item).toUpperCase();
      if (needles.some((n) => blob.includes(n))) return true;
    }
  }
  return false;
}

/** VERIFY issue 正文：去掉 L3-PROOF / 行首英文 code（兜底，优先 display_message_zh） */
export function sanitizeVerifyIssueMessage(text: string | undefined): string {
  if (!text?.trim()) return '';
  let s = sanitizeRouteRunAnswerTextForDisplay(stripL3Proof(stripAuditTags(text.trim())));
  s = s.replace(/^[A-Z][A-Z0-9_]+\s+/, '').trim();
  return s;
}

export function advisoryIssueDisplayText(issue: VerifyIssue): string {
  const display = issue.display_message_zh?.trim();
  if (display) return display;
  return (
    sanitizeVerifyIssueMessage(issue.message) ||
    sanitizeVerifyIssueMessage(issue.detail) ||
    issue.code_label_zh?.trim() ||
    ''
  );
}

export type AdvisoryDisplayLine = {
  text: string;
  count: number;
  codeLabelZh?: string;
  code?: string;
  rawMessage?: string;
};

/** POI 名去重：同一 POI 多条合并为「涉及 N 条」 */
export function dedupeAdvisoryDisplayLines(issues: VerifyIssue[]): AdvisoryDisplayLine[] {
  const groups = new Map<string, AdvisoryDisplayLine>();

  for (const issue of issues) {
    const text = advisoryIssueDisplayText(issue);
    if (!text) continue;
    const display = text.replace(/POI\s+"([^"]+)"/g, '「$1」').trim();
    const poi =
      text.match(/POI\s+"([^"]+)"/)?.[1] ?? display.match(/「([^」]+)」/)?.[1];
    const key = poi ?? display;

    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        text: display,
        count: 1,
        codeLabelZh: issue.code_label_zh,
        code: issue.code,
        rawMessage: issue.message,
      });
    }
  }

  return [...groups.values()];
}

export function advisoryPanelTitle(issues: VerifyIssue[], totalCount: number): string {
  const label = issues.find((i) => i.class_label_zh?.trim())?.class_label_zh?.trim();
  if (label && !/^ADVISORY$/i.test(label)) {
    return `${label}（${totalCount} 条）`;
  }
  return `行程提示（${totalCount} 条）`;
}

export function formatAdvisoryLine(line: AdvisoryDisplayLine): string {
  if (line.count > 1) {
    return `${line.text}（涉及 ${line.count} 条）`;
  }
  return line.text;
}
