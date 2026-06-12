import type { ActionExecutionPayload, RouteAndRunResponse } from '@/api/agent';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import type { AgentPoiDayBlock } from '@/lib/agent-poi-payload';

/** 改排草案：左侧时间轴预览（同源当轮 payload.timeline + itinerary_adjust_result） */
export interface ItineraryAdjustDraftPreview {
  scopeDateIso: string;
  targetDayNumber?: number;
  timelineDayBlocks: ItineraryDayItemsBlock[];
  adjustResult?: ItineraryAdjustResult;
  requestId?: string;
  /** POI_SLOT_FILL 等多稀疏日：展示与 Apply 用 append_sparse_days */
  multiDayAppend?: boolean;
  metadata?: Record<string, unknown>;
}

/** POST apply_itinerary_adjust_draft 落库结果（payload.itinerary_adjust_apply_result） */
export interface ItineraryAdjustApplyResult {
  applied?: boolean;
  reason?: string;
  added_count?: number;
  applied_days?: string[];
  answer_text?: string;
  [key: string]: unknown;
}

export type ItineraryAdjustExecutionMode = 'ADVICE_ONLY' | 'SEMI_AUTO' | 'AUTO';

export type ItineraryAdjustActionStatus =
  | 'NOT_STARTED'
  | 'PENDING_CONFIRM'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | string;

export interface ItineraryAdjustAutoApplyResult {
  applied?: boolean;
  reason?: string;
  deletedCount?: number;
  addedCount?: number;
  targetDateIso?: string;
}

export interface ItineraryAdjustActionExecution extends ActionExecutionPayload {
  mode?: ItineraryAdjustExecutionMode;
  status?: ItineraryAdjustActionStatus;
  requires_confirmation_count?: number;
  itinerary_adjust_auto_apply?: ItineraryAdjustAutoApplyResult;
}

export interface ItineraryAdjustResult {
  target_date_iso?: string;
  target_day_number?: number;
  execution_mode?: ItineraryAdjustExecutionMode;
  applied?: boolean;
  status_label_zh?: string;
  poi_names?: string[];
  route_context_zh?: string;
  optimization_summary_zh?: string;
  rationale_bullets_zh?: string[];
  apply_hint_zh?: string;
  corridor_fallback_level?: string;
  /** 确认 diff 行（优先于 draft_schedule_zh / 整段 optimization_summary） */
  apply_confirmation_lines?: string[];
  /** 后端完整草案日程文案；UI 勿整段重复展示 */
  draft_schedule_zh?: string;
  /** Decision OS Narrate：理性事实账本（bullets 为其压缩版） */
  experience_validation?: ItineraryAdjustExperienceValidation;
}

export type ItineraryAdjustExperienceValidationReasoningType =
  | 'EXPERIENCE_METRIC_VALIDATION'
  | string;

/** itinerary-adjust-narrate-evidence 五维事实账本 */
export interface ItineraryAdjustExperienceEvidenceFacts {
  route_efficiency?: string;
  micro_climate_safety?: string;
  physiological_pacing?: string;
  crowd_dynamics?: string;
  thermal_sequence?: string;
}

export interface ItineraryAdjustExperienceValidation {
  reasoning_type?: ItineraryAdjustExperienceValidationReasoningType;
  region_profile?: string;
  evidence_facts?: ItineraryAdjustExperienceEvidenceFacts;
}

export const ITINERARY_ADJUST_EVIDENCE_FACT_LABELS: Record<
  keyof ItineraryAdjustExperienceEvidenceFacts,
  string
> = {
  thermal_sequence: '热量顺序与生理成本',
  physiological_pacing: '生理节奏',
  crowd_dynamics: '微气候与人群避峰',
  route_efficiency: '动线与转场闭环',
  micro_climate_safety: '微气候与能见度',
};

const EVIDENCE_FACT_DISPLAY_ORDER: (keyof ItineraryAdjustExperienceEvidenceFacts)[] = [
  'thermal_sequence',
  'physiological_pacing',
  'crowd_dynamics',
  'route_efficiency',
  'micro_climate_safety',
];

/** experience_validation.evidence_facts → 分层展示行 */
export function itineraryAdjustExperienceEvidenceLayers(
  validation: ItineraryAdjustExperienceValidation | undefined
): { key: keyof ItineraryAdjustExperienceEvidenceFacts; label: string; text: string }[] {
  const facts = validation?.evidence_facts;
  if (!facts) return [];
  const out: { key: keyof ItineraryAdjustExperienceEvidenceFacts; label: string; text: string }[] =
    [];
  for (const key of EVIDENCE_FACT_DISPLAY_ORDER) {
    const text = facts[key]?.trim();
    if (!text) continue;
    out.push({ key, label: ITINERARY_ADJUST_EVIDENCE_FACT_LABELS[key], text });
  }
  return out;
}

function parseExperienceEvidenceFacts(
  raw: unknown
): ItineraryAdjustExperienceEvidenceFacts | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const pick = (k: keyof ItineraryAdjustExperienceEvidenceFacts) => {
    const v = rec[k];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };
  const facts: ItineraryAdjustExperienceEvidenceFacts = {
    ...(pick('route_efficiency') ? { route_efficiency: pick('route_efficiency') } : {}),
    ...(pick('micro_climate_safety') ? { micro_climate_safety: pick('micro_climate_safety') } : {}),
    ...(pick('physiological_pacing') ? { physiological_pacing: pick('physiological_pacing') } : {}),
    ...(pick('crowd_dynamics') ? { crowd_dynamics: pick('crowd_dynamics') } : {}),
    ...(pick('thermal_sequence') ? { thermal_sequence: pick('thermal_sequence') } : {}),
  };
  return Object.keys(facts).length > 0 ? facts : undefined;
}

function parseExperienceValidation(raw: unknown): ItineraryAdjustExperienceValidation | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const reasoningType =
    typeof rec.reasoning_type === 'string'
      ? rec.reasoning_type.trim()
      : typeof rec.reasoningType === 'string'
        ? rec.reasoningType.trim()
        : undefined;
  const regionProfile =
    typeof rec.region_profile === 'string'
      ? rec.region_profile.trim()
      : typeof rec.regionProfile === 'string'
        ? rec.regionProfile.trim()
        : undefined;
  const evidenceFacts = parseExperienceEvidenceFacts(rec.evidence_facts ?? rec.evidenceFacts);
  if (!reasoningType && !regionProfile && !evidenceFacts) return undefined;
  return {
    ...(reasoningType ? { reasoning_type: reasoningType } : {}),
    ...(regionProfile ? { region_profile: regionProfile } : {}),
    ...(evidenceFacts ? { evidence_facts: evidenceFacts } : {}),
  };
}

export interface ItineraryAdjustPayload {
  itinerary_adjust_intake?: true;
  itinerary_adjust_result?: ItineraryAdjustResult;
  timeline?: unknown[];
  poi_cards?: unknown[];
  poi_cards_meta?: {
    itinerary_adjust_poi_scope_date?: string;
    suppress_answer_prose?: boolean;
    [key: string]: unknown;
  };
  iron_shield_ui_suppressed?: boolean;
  decision_cockpit_ui_suppressed?: boolean;
  actionExecution?: ItineraryAdjustActionExecution;
  orchestrationResult?: {
    state?: {
      metadata?: Record<string, unknown>;
    };
  };
}

export interface ParsedItineraryAdjustOutcome {
  intake: boolean;
  scopeDateIso?: string;
  actionExecution?: ItineraryAdjustActionExecution;
  adjustResult?: ItineraryAdjustResult;
  ironShieldUiSuppressed: boolean;
  decisionCockpitUiSuppressed: boolean;
  autoApplied: boolean;
  isDraft: boolean;
  autoApplyReason?: string;
  metadata?: Record<string, unknown>;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
  return out.length > 0 ? out : undefined;
}

export function parseItineraryAdjustResult(raw: unknown): ItineraryAdjustResult | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;

  const targetDate =
    typeof rec.target_date_iso === 'string'
      ? rec.target_date_iso.trim()
      : typeof rec.targetDateIso === 'string'
        ? rec.targetDateIso.trim()
        : undefined;

  const dayNumRaw = rec.target_day_number ?? rec.targetDayNumber;
  const targetDayNumber =
    typeof dayNumRaw === 'number' && Number.isFinite(dayNumRaw)
      ? dayNumRaw
      : typeof dayNumRaw === 'string' && /^\d+$/.test(dayNumRaw.trim())
        ? Number(dayNumRaw.trim())
        : undefined;

  const statusLabel =
    typeof rec.status_label_zh === 'string'
      ? rec.status_label_zh.trim()
      : typeof rec.statusLabelZh === 'string'
        ? rec.statusLabelZh.trim()
        : undefined;

  const optimizationSummary =
    typeof rec.optimization_summary_zh === 'string'
      ? rec.optimization_summary_zh.trim()
      : typeof rec.optimizationSummaryZh === 'string'
        ? rec.optimizationSummaryZh.trim()
        : undefined;

  const routeContext =
    typeof rec.route_context_zh === 'string'
      ? rec.route_context_zh.trim()
      : typeof rec.routeContextZh === 'string'
        ? rec.routeContextZh.trim()
        : undefined;

  const applyHint =
    typeof rec.apply_hint_zh === 'string'
      ? rec.apply_hint_zh.trim()
      : typeof rec.applyHintZh === 'string'
        ? rec.applyHintZh.trim()
        : undefined;

  const corridorLevel =
    typeof rec.corridor_fallback_level === 'string'
      ? rec.corridor_fallback_level.trim()
      : typeof rec.corridorFallbackLevel === 'string'
        ? rec.corridorFallbackLevel.trim()
        : undefined;

  const executionModeRaw = rec.execution_mode ?? rec.executionMode;
  const executionMode =
    executionModeRaw === 'ADVICE_ONLY' ||
    executionModeRaw === 'SEMI_AUTO' ||
    executionModeRaw === 'AUTO'
      ? executionModeRaw
      : undefined;

  const poiNames = asStringArray(rec.poi_names ?? rec.poiNames);
  const rationaleBullets = asStringArray(rec.rationale_bullets_zh ?? rec.rationaleBulletsZh);
  const applyConfirmationLines = asStringArray(
    rec.apply_confirmation_lines ?? rec.applyConfirmationLines
  );

  const draftScheduleZh =
    typeof rec.draft_schedule_zh === 'string'
      ? rec.draft_schedule_zh.trim()
      : typeof rec.draftScheduleZh === 'string'
        ? rec.draftScheduleZh.trim()
        : undefined;

  const experienceValidation = parseExperienceValidation(
    rec.experience_validation ?? rec.experienceValidation
  );

  const hasContent =
    Boolean(targetDate) ||
    targetDayNumber != null ||
    Boolean(statusLabel) ||
    Boolean(optimizationSummary) ||
    Boolean(routeContext) ||
    Boolean(applyHint) ||
    Boolean(draftScheduleZh) ||
    Boolean(experienceValidation) ||
    (poiNames?.length ?? 0) > 0 ||
    (rationaleBullets?.length ?? 0) > 0 ||
    (applyConfirmationLines?.length ?? 0) > 0;

  if (!hasContent) return undefined;

  return {
    ...(targetDate ? { target_date_iso: targetDate } : {}),
    ...(targetDayNumber != null ? { target_day_number: targetDayNumber } : {}),
    ...(executionMode ? { execution_mode: executionMode } : {}),
    ...(rec.applied === true ? { applied: true } : rec.applied === false ? { applied: false } : {}),
    ...(statusLabel ? { status_label_zh: statusLabel } : {}),
    ...(poiNames ? { poi_names: poiNames } : {}),
    ...(routeContext ? { route_context_zh: routeContext } : {}),
    ...(optimizationSummary ? { optimization_summary_zh: optimizationSummary } : {}),
    ...(rationaleBullets ? { rationale_bullets_zh: rationaleBullets } : {}),
    ...(applyHint ? { apply_hint_zh: applyHint } : {}),
    ...(corridorLevel ? { corridor_fallback_level: corridorLevel } : {}),
    ...(applyConfirmationLines ? { apply_confirmation_lines: applyConfirmationLines } : {}),
    ...(draftScheduleZh ? { draft_schedule_zh: draftScheduleZh } : {}),
    ...(experienceValidation ? { experience_validation: experienceValidation } : {}),
  };
}

/** 日期对齐（ScheduleTab 与 scope_date） */
export function normalizeItineraryAdjustDateIso(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.trim();
  return t.includes('T') ? t.split('T')[0] : t;
}

export function scheduleDayMatchesItineraryAdjustScope(
  dayDate: string,
  scopeDateIso: string | undefined
): boolean {
  const a = normalizeItineraryAdjustDateIso(dayDate);
  const b = normalizeItineraryAdjustDateIso(scopeDateIso);
  return Boolean(a && b && a === b);
}

/** 左侧 ScheduleTab：单日 scope 或多稀疏日草案预览日匹配 */
export function scheduleDayMatchesItineraryAdjustDraftPreview(
  dayDate: string,
  preview: ItineraryAdjustDraftPreview
): boolean {
  if (preview.multiDayAppend) {
    const normalizedDay = normalizeItineraryAdjustDateIso(dayDate);
    return preview.timelineDayBlocks.some((d) => {
      const dDate = normalizeItineraryAdjustDateIso(d.date);
      return Boolean(dDate && dDate === normalizedDay && (d.items?.length ?? 0) > 0);
    });
  }
  return scheduleDayMatchesItineraryAdjustScope(dayDate, preview.scopeDateIso);
}

/** 确认 diff：优先 apply_confirmation_lines，勿整段 draft_schedule_zh */
export function itineraryAdjustConfirmationLines(result: ItineraryAdjustResult): string[] {
  const lines = result.apply_confirmation_lines?.filter((l) => l.trim()) ?? [];
  if (lines.length > 0) return lines;
  return [];
}

const SCHEDULE_SECTION_HEADER_RE = /^当日安排[：:]?\s*$/;
const SCHEDULE_TIME_LINE_RE = /^\d{1,2}:\d{2}/;

/** apply_confirmation_lines 里由后端生成的「当日安排」摘要行（常与 timeline 重复且可能被截断） */
export function isItineraryAdjustScheduleSummaryLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (SCHEDULE_SECTION_HEADER_RE.test(t)) return true;
  if (SCHEDULE_TIME_LINE_RE.test(t)) return true;
  return false;
}

/** 有完整 timeline 时去掉日程摘要行，避免与结构化草案重复且省略号截断 */
export function itineraryAdjustNonScheduleConfirmationLines(
  result: ItineraryAdjustResult,
  hasStructuredSchedule: boolean
): string[] {
  const lines = itineraryAdjustConfirmationLines(result);
  if (!hasStructuredSchedule) return lines;
  return lines.filter((line) => !isItineraryAdjustScheduleSummaryLine(line));
}

/** 改排卡/左侧预览：优先目标日；无匹配则展示全部含条目的天 */
export function pickItineraryAdjustTimelineDays(
  blocks: ItineraryDayItemsBlock[] | undefined,
  targetDateIso?: string
): ItineraryDayItemsBlock[] {
  if (!blocks?.length) return [];
  const withItems = blocks.filter((d) => (d.items?.length ?? 0) > 0);
  const candidates = withItems.length > 0 ? withItems : blocks;
  if (candidates.length === 1) return candidates;

  const target = normalizeItineraryAdjustDateIso(targetDateIso);
  if (!target) return candidates;

  const matched = candidates.filter((d) => normalizeItineraryAdjustDateIso(d.date) === target);
  if (matched.some((d) => (d.items?.length ?? 0) > 0)) return matched;
  return candidates;
}

/** poi_cards_by_day → timeline 条目（timeline 缺失时的展示兜底） */
export function poiDayBlocksToTimelineDayBlocks(
  blocks: AgentPoiDayBlock[] | undefined,
  targetDateIso?: string
): ItineraryDayItemsBlock[] {
  if (!blocks?.length) return [];
  let scoped = blocks.filter((b) => (b.cards?.length ?? 0) > 0);
  const target = normalizeItineraryAdjustDateIso(targetDateIso);
  if (target) {
    const matched = scoped.filter((b) => normalizeItineraryAdjustDateIso(b.date) === target);
    if (matched.length > 0) scoped = matched;
  }
  return scoped.map((b) => ({
    ...(b.date ? { date: b.date } : {}),
    items: b.cards.map((c) => ({
      title: c.displayName,
      name: c.displayName,
      ...(c.startWindow ? { start_window: c.startWindow, startWindow: c.startWindow } : {}),
      ...(c.endWindow ? { end_window: c.endWindow, endWindow: c.endWindow } : {}),
      ...(c.address ? { address: c.address } : {}),
      ...(c.category ? { type: c.category, item_type: c.category } : {}),
      ...(c.placeId ? { place_id: c.placeId, placeId: c.placeId } : {}),
      location_ref: {
        name: c.displayName,
        ...(c.placeId ? { place_id: c.placeId } : {}),
        ...(c.lat != null ? { lat: c.lat } : {}),
        ...(c.lng != null ? { lng: c.lng } : {}),
      },
    })),
  }));
}

const CONFIRMATION_SCHEDULE_ITEM_RE =
  /^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.+?)(?:\s*[（(]([^)）]+)[)）])?\s*(?:\.{3}|…)?\s*$/;

/** 从 apply_confirmation_lines 解析时间窗条目（后端 timeline 缺失时的最后兜底） */
export function confirmationLinesToTimelineDayBlocks(
  lines: string[],
  targetDateIso?: string
): ItineraryDayItemsBlock[] {
  const items: unknown[] = [];
  for (const line of lines) {
    if (!isItineraryAdjustScheduleSummaryLine(line)) continue;
    const t = line.trim();
    if (SCHEDULE_SECTION_HEADER_RE.test(t)) continue;
    const m = t.match(CONFIRMATION_SCHEDULE_ITEM_RE);
    if (!m) continue;
    const title = m[3].replace(/(\.{3}|…)\s*$/, '').trim();
    if (!title) continue;
    items.push({
      title,
      name: title,
      start_window: m[1],
      end_window: m[2],
      startWindow: m[1],
      endWindow: m[2],
      ...(m[4] ? { type: m[4], item_type: m[4] } : {}),
      location_ref: { name: title },
    });
  }
  if (!items.length) return [];
  const date = normalizeItineraryAdjustDateIso(targetDateIso);
  return [{ ...(date ? { date } : {}), items }];
}

/** 合并 timeline / 左侧 preview / poi_cards（勿用 apply_confirmation_lines 拼时段） */
export function resolveItineraryAdjustScheduleDays(options: {
  timelineDayBlocks?: ItineraryDayItemsBlock[];
  fallbackTimelineDayBlocks?: ItineraryDayItemsBlock[];
  poiCardsByDay?: AgentPoiDayBlock[];
  targetDateIso?: string;
  /** POI_SLOT_FILL：返回全部含条目的稀疏日 */
  includeAllSparseDays?: boolean;
}): ItineraryDayItemsBlock[] {
  const target = options.targetDateIso;
  const pick = (source: ItineraryDayItemsBlock[] | undefined) => {
    if (!source?.length) return [] as ItineraryDayItemsBlock[];
    if (options.includeAllSparseDays) {
      const sparse = source.filter((d) => (d.items?.length ?? 0) > 0);
      if (sparse.length > 0) return sparse;
    }
    return pickItineraryAdjustTimelineDays(source, target);
  };
  for (const source of [options.timelineDayBlocks, options.fallbackTimelineDayBlocks]) {
    const picked = pick(source);
    if (picked.some((d) => (d.items?.length ?? 0) > 0)) return picked;
  }
  return pickItineraryAdjustTimelineDays(
    poiDayBlocksToTimelineDayBlocks(options.poiCardsByDay, target),
    target
  );
}

export type ItineraryAdjustBodyContent =
  | { kind: 'bullets'; lines: string[] }
  | { kind: 'text'; text: string };

/**
 * 正文（短说明）：rationale_bullets_zh → optimization_summary_zh → answer_text。
 * 勿拼接 route_context_zh / apply_confirmation_lines。
 */
export function itineraryAdjustBodyContent(
  result: ItineraryAdjustResult,
  answerTextFallback?: string
): ItineraryAdjustBodyContent | null {
  const bullets = result.rationale_bullets_zh?.map((l) => l.trim()).filter(Boolean) ?? [];
  if (bullets.length > 0) return { kind: 'bullets', lines: bullets };
  const summary = result.optimization_summary_zh?.trim();
  if (summary) return { kind: 'text', text: summary };
  const answer = answerTextFallback?.trim();
  if (answer) return { kind: 'text', text: answer };
  return null;
}

/** @deprecated 改排气泡勿再拼接 route_context / apply_confirmation_lines */
export function itineraryAdjustPrimaryNarrativeText(result: ItineraryAdjustResult): string | undefined {
  const body = itineraryAdjustBodyContent(result);
  if (!body) return undefined;
  return body.kind === 'text' ? body.text : body.lines.join('\n');
}

/** @deprecated 改排气泡不再展示 apply_confirmation_lines */
export function itineraryAdjustExtraConfirmationLines(
  _result: ItineraryAdjustResult,
  _hasStructuredSchedule?: boolean,
  _primaryNarrative?: string
): string[] {
  return [];
}

/** 右侧/左侧摘要正文（仅 optimization_summary；无则空） */
export function itineraryAdjustResultBodyText(result: ItineraryAdjustResult): string {
  const body = itineraryAdjustBodyContent(result);
  if (!body) return '';
  return body.kind === 'text' ? body.text : body.lines.join('\n');
}

export function itineraryAdjustResultTitle(result: ItineraryAdjustResult): string | undefined {
  const day = result.target_day_number;
  const date = result.target_date_iso;
  if (day != null && date) return `第 ${day} 天 (${date})`;
  if (day != null) return `第 ${day} 天`;
  if (date) return date;
  return undefined;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function pickActionExecution(payload: Record<string, unknown>): ItineraryAdjustActionExecution | undefined {
  const raw = payload.actionExecution ?? payload.action_execution;
  return asRecord(raw) as ItineraryAdjustActionExecution | undefined;
}

export function parseItineraryAdjustPayload(
  payload: Record<string, unknown> | undefined | null
): ParsedItineraryAdjustOutcome {
  if (!payload) {
    return {
      intake: false,
      ironShieldUiSuppressed: false,
      decisionCockpitUiSuppressed: false,
      autoApplied: false,
      isDraft: false,
    };
  }

  const intake =
    payload.itinerary_adjust_intake === true || payload.itineraryAdjustIntake === true;

  const poiMeta = asRecord(payload.poi_cards_meta ?? payload.poiCardsMeta);
  const scopeRaw = poiMeta?.itinerary_adjust_poi_scope_date ?? poiMeta?.itineraryAdjustPoiScopeDate;
  const scopeDateIso = typeof scopeRaw === 'string' ? scopeRaw.trim() || undefined : undefined;

  const ironShieldUiSuppressed =
    payload.iron_shield_ui_suppressed === true || payload.ironShieldUiSuppressed === true;
  const decisionCockpitUiSuppressed =
    payload.decision_cockpit_ui_suppressed === true ||
    payload.decisionCockpitUiSuppressed === true ||
    intake;

  const actionExecution = pickActionExecution(payload);
  const adjustResult = parseItineraryAdjustResult(
    payload.itinerary_adjust_result ?? payload.itineraryAdjustResult
  );
  const autoApplied = isItineraryAdjustAutoCommitted({ actionExecution });
  const isDraft = intake && !autoApplied;

  const orch = asRecord(payload.orchestrationResult ?? payload.orchestration_result);
  const state = asRecord(orch?.state);
  const metadata = asRecord(state?.metadata);

  return {
    intake,
    scopeDateIso: scopeDateIso ?? adjustResult?.target_date_iso,
    actionExecution,
    adjustResult,
    ironShieldUiSuppressed,
    decisionCockpitUiSuppressed,
    autoApplied,
    isDraft,
    autoApplyReason: actionExecution?.itinerary_adjust_auto_apply?.reason,
    metadata,
  };
}

export function parseItineraryAdjustFromRouteRun(
  response: RouteAndRunResponse
): ParsedItineraryAdjustOutcome {
  const payload = response.result?.payload as Record<string, unknown> | undefined;
  return parseItineraryAdjustPayload(payload);
}

export function isItineraryAdjustAutoCommitted(p: {
  actionExecution?: ItineraryAdjustActionExecution;
}): boolean {
  const ax = p.actionExecution;
  const autoApply = ax?.itinerary_adjust_auto_apply;
  if (autoApply?.applied !== true) return false;
  return (
    (ax?.mode === 'AUTO' || ax?.mode === 'SEMI_AUTO') && ax?.status === 'SUCCEEDED'
  );
}

export function parseItineraryAdjustApplyResult(
  payload: Record<string, unknown> | undefined | null
): ItineraryAdjustApplyResult | undefined {
  if (!payload) return undefined;
  const raw = payload.itinerary_adjust_apply_result ?? payload.itineraryAdjustApplyResult;
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const applied = rec.applied === true ? true : rec.applied === false ? false : undefined;
  const reason =
    typeof rec.reason === 'string' && rec.reason.trim() ? rec.reason.trim() : undefined;
  const answerText =
    typeof rec.answer_text === 'string' && rec.answer_text.trim()
      ? rec.answer_text.trim()
      : typeof rec.answerText === 'string' && rec.answerText.trim()
        ? rec.answerText.trim()
        : undefined;
  const addedCount =
    typeof rec.added_count === 'number'
      ? rec.added_count
      : typeof rec.addedCount === 'number'
        ? rec.addedCount
        : undefined;
  const appliedDaysRaw = rec.applied_days ?? rec.appliedDays;
  const applied_days = Array.isArray(appliedDaysRaw)
    ? appliedDaysRaw.map((d) => String(d).trim()).filter(Boolean)
    : undefined;
  if (
    applied === undefined &&
    !reason &&
    !answerText &&
    addedCount === undefined &&
    !(applied_days?.length)
  ) {
    return undefined;
  }
  return {
    ...(applied !== undefined ? { applied } : {}),
    ...(reason ? { reason } : {}),
    ...(answerText ? { answer_text: answerText } : {}),
    ...(addedCount !== undefined ? { added_count: addedCount } : {}),
    ...(applied_days?.length ? { applied_days } : {}),
  };
}

export function itineraryAdjustApplyFailureMessage(
  applyResult: ItineraryAdjustApplyResult | undefined,
  fallbacks?: { uiHintMessage?: string; answerText?: string }
): string {
  return (
    applyResult?.answer_text?.trim() ||
    applyResult?.reason?.trim() ||
    fallbacks?.uiHintMessage?.trim() ||
    fallbacks?.answerText?.trim() ||
    '未能写入行程，请检查地点是否可解析后重试'
  );
}

/** 改排专用：隐藏 Iron Shield / 方案墙 / 决策驾驶舱 */
export function shouldSuppressItineraryAdjustPlanningChrome(
  outcome: ParsedItineraryAdjustOutcome
): boolean {
  return (
    outcome.intake &&
    (outcome.ironShieldUiSuppressed ||
      outcome.decisionCockpitUiSuppressed ||
      outcome.autoApplied ||
      outcome.isDraft)
  );
}

export function itineraryAdjustUiHintMessage(outcome: ParsedItineraryAdjustOutcome): string | undefined {
  if (!outcome.intake) return undefined;
  if (outcome.adjustResult?.status_label_zh?.trim()) {
    return outcome.adjustResult.status_label_zh.trim();
  }
  if (outcome.autoApplied) return '行程已更新';
  if (outcome.autoApplyReason === 'unresolved_places') {
    return '部分地点无法写入，请确认草案';
  }
  return '草案待确认';
}

export const ITINERARY_ADJUST_APPLY_DRAFT_MESSAGE = '应用到行程';

/** @deprecated 使用 ITINERARY_ADJUST_APPLY_DRAFT_MESSAGE（与 route_and_run message 对齐） */
export const ITINERARY_ADJUST_APPLY_DRAFT_LEGACY_MESSAGE = '就把这个改动应用到行程里';

/** 草案预览：勿用本响应刷新 GET trip / 左侧正式时间轴 */
export function shouldSuppressLeftTripRefresh(outcome: ParsedItineraryAdjustOutcome): boolean {
  return outcome.intake && outcome.isDraft;
}

export function buildItineraryAdjustMessageFields(
  outcome: ParsedItineraryAdjustOutcome
): Record<string, unknown> {
  if (!outcome.intake) return {};
  const multiDayAppend =
    outcome.metadata?.sub_intent === 'POI_SLOT_FILL' ||
    outcome.metadata?.subIntent === 'POI_SLOT_FILL';
  return {
    itineraryAdjustIntake: true as const,
    itineraryAdjustAutoApplied: outcome.autoApplied,
    itineraryAdjustDraft: outcome.isDraft,
    ...(outcome.scopeDateIso ? { itineraryAdjustScopeDate: outcome.scopeDateIso } : {}),
    ...(outcome.autoApplyReason ? { itineraryAdjustAutoApplyReason: outcome.autoApplyReason } : {}),
    ...(outcome.adjustResult ? { itineraryAdjustResult: outcome.adjustResult } : {}),
    ...(outcome.metadata ? { itineraryAdjustMetadata: outcome.metadata } : {}),
    ...(multiDayAppend ? { itineraryAdjustMultiDayAppend: true } : {}),
    ironShieldUiSuppressed: outcome.ironShieldUiSuppressed,
    decisionCockpitUiSuppressed: outcome.decisionCockpitUiSuppressed,
  };
}

/** 改排草案 → 左侧 ScheduleTab 预览（当轮 timeline + result，勿 GET Trip 拼总结） */
export function buildItineraryAdjustDraftPreview(
  outcome: ParsedItineraryAdjustOutcome,
  timelineDayBlocks: ItineraryDayItemsBlock[] | undefined,
  requestId?: string
): ItineraryAdjustDraftPreview | null {
  if (!outcome.intake || !outcome.isDraft || !timelineDayBlocks?.length) return null;
  const scopeDateIso =
    outcome.scopeDateIso ?? outcome.adjustResult?.target_date_iso ?? timelineDayBlocks[0]?.date;
  if (!scopeDateIso?.trim()) return null;
  const multiDayAppend =
    (timelineDayBlocks.filter((d) => (d.items?.length ?? 0) > 0).length > 1) ||
    (outcome.metadata?.sub_intent === 'POI_SLOT_FILL' ||
      outcome.metadata?.subIntent === 'POI_SLOT_FILL');
  return {
    scopeDateIso: scopeDateIso.trim(),
    ...(outcome.adjustResult?.target_day_number != null
      ? { targetDayNumber: outcome.adjustResult.target_day_number }
      : {}),
    timelineDayBlocks,
    ...(outcome.adjustResult ? { adjustResult: outcome.adjustResult } : {}),
    ...(requestId ? { requestId } : {}),
    ...(multiDayAppend ? { multiDayAppend: true } : {}),
    ...(outcome.metadata ? { metadata: outcome.metadata } : {}),
  };
}

export type PlanStudioAdjustDraftSink = {
  setItineraryAdjustDraftPreview: (preview: ItineraryAdjustDraftPreview | null) => void;
  clearItineraryAdjustDraftPreview: () => void;
};

export function syncItineraryAdjustDraftToPlanStudio(
  sink: PlanStudioAdjustDraftSink | null | undefined,
  outcome: ParsedItineraryAdjustOutcome,
  timelineDayBlocks: ItineraryDayItemsBlock[] | undefined,
  requestId?: string
): void {
  if (!sink) return;
  if (!outcome.intake || outcome.autoApplied) {
    sink.clearItineraryAdjustDraftPreview();
    return;
  }
  const preview = buildItineraryAdjustDraftPreview(outcome, timelineDayBlocks, requestId);
  if (preview) {
    sink.setItineraryAdjustDraftPreview(preview);
  } else if (!outcome.isDraft) {
    sink.clearItineraryAdjustDraftPreview();
  }
}
