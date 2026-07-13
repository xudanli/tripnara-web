/**
 * SDR-202 / 不夜驾 · 结构化 evidence 与 preview item 解析
 * 与后端 sdr-202-rule-metadata.util.ts 人话层对齐
 */

export interface Sdr202StructuredEvidence {
  day?: number;
  dayIndex?: number;
  sunsetLocal?: string;
  cutoffLocal?: string;
  arriveLocal?: string;
  maxMinutesAfterSunset?: number;
  segmentLabel?: string;
  degradationReason?: string;
  limit?: string;
  actual?: string;
  measuredMinutes?: number;
  measuredValue?: string;
  message?: string;
  ruleId?: string;
}

const DEGRADATION_REASON_LABELS: Record<string, string> = {
  DAYLIGHT_DATA_AMBIGUOUS: '日照数据不可用（高纬极昼/极夜）',
  DAYLIGHT_DATA_MISSING: '日照数据缺失，无法判定夜间驾驶',
};

const SEGMENT_ARROW_PATTERN = /\S+\s*→\s*\S+/;

function parseLocalHm(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatLocalHm(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function addMinutesToLocalHm(time: string, minutes: number): string | undefined {
  const base = parseLocalHm(time);
  if (base == null) return undefined;
  return formatLocalHm(base + minutes);
}

/** arrive 是否晚于 cutoff（可跨午夜） */
export function minutesAfterLocalHm(from: string, to: string): number | null {
  const fromMin = parseLocalHm(from);
  const toMin = parseLocalHm(to);
  if (fromMin == null || toMin == null) return null;
  if (toMin >= fromMin) return toMin - fromMin;
  const nextDayOver = toMin + 24 * 60 - fromMin;
  // 跨午夜且合理（<=12h）；否则视为同日 to 早于 from（无超时）
  if (nextDayOver <= 12 * 60) return nextDayOver;
  return toMin - fromMin;
}

function formatOverageMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function isNoNightDriveConstraintDraftId(draftId: string): boolean {
  return draftId === 'no_night_drive' || draftId === 'c_no_night_drive';
}

export function applyNoNightDriveBufferToEvidence(
  evidence: Sdr202StructuredEvidence | undefined,
  bufferMinutes: number,
): Sdr202StructuredEvidence | undefined {
  if (!evidence || isNoNightDriveDegradationEvidence(evidence)) return evidence;

  const sunsetLocal = evidence.sunsetLocal?.trim();
  const cutoffLocal =
    (sunsetLocal ? addMinutesToLocalHm(sunsetLocal, bufferMinutes) : undefined) ??
    evidence.cutoffLocal;

  let measuredMinutes = evidence.measuredMinutes;
  if (evidence.arriveLocal && cutoffLocal) {
    const over = minutesAfterLocalHm(cutoffLocal, evidence.arriveLocal);
    if (over != null && over > 0) measuredMinutes = over;
  }

  return {
    ...evidence,
    maxMinutesAfterSunset: bufferMinutes,
    cutoffLocal,
    measuredMinutes,
    actual:
      measuredMinutes != null && measuredMinutes > 0
        ? formatOverageMinutes(measuredMinutes)
        : evidence.actual,
    limit: sunsetLocal ? `日落 ${sunsetLocal} + ${bufferMinutes}min` : evidence.limit,
    message: undefined,
  };
}

export function formatNoNightDriveViolationMessage(
  evidence: Sdr202StructuredEvidence,
): string | undefined {
  if (!evidence.arriveLocal || !evidence.cutoffLocal) return undefined;
  const buffer = evidence.maxMinutesAfterSunset ?? 0;
  const over = minutesAfterLocalHm(evidence.cutoffLocal, evidence.arriveLocal);
  const overLabel = over != null && over > 0 ? `，+${over}min` : '';
  if (evidence.sunsetLocal) {
    return `预计 ${evidence.arriveLocal} 结束，超出安全截止 ${evidence.cutoffLocal}（日落 ${evidence.sunsetLocal} + ${buffer} 分钟${overLabel}）`;
  }
  return `预计 ${evidence.arriveLocal} 仍在驾驶，截止 ${evidence.cutoffLocal}${overLabel}`;
}

function extractSunsetFromText(text: string): string | undefined {
  const match = text.match(/日落\s*(\d{1,2}:\d{2})/);
  return match?.[1];
}

function extractArriveFromText(text: string): string | undefined {
  const match = text.match(/预计\s*(\d{1,2}:\d{2})/);
  return match?.[1];
}

export function reprojectNoNightDriveTextWithBuffer(
  text: string,
  bufferMinutes: number,
): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const sunset = extractSunsetFromText(trimmed);
  const arrive = extractArriveFromText(trimmed);
  if (sunset) {
    const evidence = applyNoNightDriveBufferToEvidence(
      {
        sunsetLocal: sunset,
        arriveLocal: arrive,
        maxMinutesAfterSunset: bufferMinutes,
      },
      bufferMinutes,
    );
    const rebuilt = evidence ? formatNoNightDriveViolationMessage(evidence) : undefined;
    if (rebuilt) return rebuilt;
  }

  return trimmed
    .replace(/(日落\s*\d{1,2}:\d{2}\s*\+\s*)\d+(?=\s*分钟)/g, `$1${bufferMinutes}`)
    .replace(/(日落后\s*)\d+(?=\s*分钟)/g, `$1${bufferMinutes}`)
    .replace(/\+\s*\d+\s*min/g, (match, offset, whole) => {
      if (whole.slice(Math.max(0, offset - 20), offset).includes('日落')) return match;
      return `+${bufferMinutes}min`;
    });
}

export function formatSdr202DegradationReason(reason: string | undefined): string | undefined {
  const trimmed = reason?.trim();
  if (!trimmed) return undefined;
  return DEGRADATION_REASON_LABELS[trimmed] ?? trimmed;
}

export function isNoNightDriveDegradationEvidence(
  evidence: Sdr202StructuredEvidence | undefined,
): boolean {
  return Boolean(evidence?.degradationReason?.trim());
}

export function isNoNightDriveDegradationPreviewItem(item: {
  label?: string;
  detail?: string;
  impactType?: string;
  startTimeLabel?: string;
}): boolean {
  if (item.impactType === 'DEGRADED') return true;
  const label = item.label?.trim() ?? '';
  if (/^SDR-202$/i.test(label) && !item.startTimeLabel && !SEGMENT_ARROW_PATTERN.test(label)) {
    return true;
  }
  const detail = item.detail?.trim() ?? '';
  return detail.includes('已降级') || detail.includes('日照数据不可用');
}

export function isNoNightDriveActivityPreviewItem(item: {
  label?: string;
  detail?: string;
  impactType?: string;
  startTimeLabel?: string;
}): boolean {
  if (isNoNightDriveDegradationPreviewItem(item)) return false;
  if (item.impactType === 'TIME_WINDOW') return true;
  const label = item.label?.trim() ?? '';
  return SEGMENT_ARROW_PATTERN.test(label) && Boolean(item.detail?.trim() || item.startTimeLabel?.trim());
}

export function formatNoNightDriveLaneEvidence(
  evidence: Sdr202StructuredEvidence | undefined,
  fallbackMessage?: string,
): string | undefined {
  if (!evidence) return fallbackMessage?.trim() || undefined;

  const degradation = formatSdr202DegradationReason(evidence.degradationReason);
  if (degradation) return degradation;

  const parts: string[] = [];
  const day = evidence.day ?? evidence.dayIndex;
  if (day != null) parts.push(`Day${day}`);

  const segment = evidence.segmentLabel?.trim();
  if (segment) parts.push(segment);

  if (evidence.arriveLocal && evidence.cutoffLocal) {
    parts.push(`${evidence.arriveLocal} 结束，截止 ${evidence.cutoffLocal}`);
  } else if (evidence.actual?.trim()) {
    parts.push(evidence.actual.trim());
  } else if (evidence.measuredValue?.trim()) {
    parts.push(evidence.measuredValue.trim());
  }

  if (evidence.sunsetLocal?.trim()) {
    const buffer =
      evidence.maxMinutesAfterSunset != null
        ? ` + ${evidence.maxMinutesAfterSunset}min`
        : '';
    parts.push(`日落 ${evidence.sunsetLocal.trim()}${buffer}`);
  } else if (evidence.limit?.trim()) {
    parts.push(evidence.limit.trim());
  }

  if (parts.length) return parts.join(' · ');
  return evidence.message?.trim() || fallbackMessage?.trim() || undefined;
}

export function buildNoNightDrivePreviewItemFromEvidence(input: {
  evidence?: Sdr202StructuredEvidence;
  message?: string;
  startTimeLabel?: string;
  bufferMinutes?: number;
}): { label: string; startTimeLabel?: string; detail?: string; impactType?: string } | undefined {
  const bufferMinutes = input.bufferMinutes;
  const evidence =
    bufferMinutes != null
      ? applyNoNightDriveBufferToEvidence(input.evidence, bufferMinutes)
      : input.evidence;
  if (!evidence && !input.message?.trim()) return undefined;

  if (isNoNightDriveDegradationEvidence(evidence)) {
    return {
      label: 'SDR-202',
      detail:
        formatSdr202DegradationReason(evidence?.degradationReason) ??
        evidence?.message?.trim() ??
        input.message?.trim(),
      impactType: 'DEGRADED',
    };
  }

  const label =
    evidence?.segmentLabel?.trim() ??
    extractSegmentLabelFromMessage(evidence?.message ?? input.message) ??
    '驾驶段';

  const detail =
    formatNoNightDrivePreviewDetail(evidence) ??
    (bufferMinutes != null && input.message
      ? reprojectNoNightDriveTextWithBuffer(input.message, bufferMinutes)
      : input.message?.trim()) ??
    evidence?.message?.trim();

  if (!detail) return undefined;

  return {
    label,
    startTimeLabel: input.startTimeLabel,
    detail,
    impactType: 'TIME_WINDOW',
  };
}

export function formatNoNightDrivePreviewDetail(
  evidence: Sdr202StructuredEvidence | undefined,
): string | undefined {
  if (!evidence) return undefined;
  if (isNoNightDriveDegradationEvidence(evidence)) {
    return formatSdr202DegradationReason(evidence.degradationReason);
  }

  const structured = formatNoNightDriveViolationMessage(evidence);
  if (structured) return structured;

  if (evidence.message?.trim()) return evidence.message.trim();

  if (evidence.actual?.trim()) return evidence.actual.trim();
  return undefined;
}

/** BFF preview-impact 500 时，assessment 快照仍为持久化 buffer；仅 fallback 路径调用 */
export function reprojectNoNightDrivePreviewWithDraft(
  preview: import('@/components/plan-studio/workbench/constraint-console-types').ConstraintImpactPreview,
  draft: { id: string; targetValue: number },
): import('@/components/plan-studio/workbench/constraint-console-types').ConstraintImpactPreview {
  if (!isNoNightDriveConstraintDraftId(draft.id)) return preview;
  const bufferMinutes = Math.round(draft.targetValue);
  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0) return preview;

  const affectedDayDetails = preview.affectedDayDetails?.map((day) => ({
    ...day,
    daySummary: day.daySummary
      ? reprojectNoNightDriveTextWithBuffer(day.daySummary, bufferMinutes)
      : day.daySummary,
    items: day.items.map((item) =>
      isNoNightDriveDegradationPreviewItem(item)
        ? item
        : {
            ...item,
            detail: item.detail
              ? reprojectNoNightDriveTextWithBuffer(item.detail, bufferMinutes)
              : item.detail,
          },
    ),
  }));

  const userSummary = preview.userSummary?.verdictReason
    ? {
        ...preview.userSummary,
        verdictReason: reprojectNoNightDriveTextWithBuffer(
          preview.userSummary.verdictReason,
          bufferMinutes,
        ),
      }
    : preview.userSummary;

  const diffBullets = preview.diffBullets.map((line) =>
    /日落|日落后|SDR-202|安全截止/.test(line)
      ? reprojectNoNightDriveTextWithBuffer(line, bufferMinutes)
      : line,
  );

  const constraintAssessments = preview.constraintAssessments?.map((entry) => {
    if (
      entry.constraintKey !== 'NO_NIGHT_DRIVE' &&
      entry.legacyConstraintId !== 'c_no_night_drive' &&
      entry.assessment?.lanes?.executability?.ruleId !== 'SDR-202'
    ) {
      return entry;
    }
    const lane = entry.assessment?.lanes?.executability;
    if (!lane) return entry;
    const projectedEvidence = applyNoNightDriveBufferToEvidence(
      lane.evidence as Sdr202StructuredEvidence | undefined,
      bufferMinutes,
    );
    const message =
      (projectedEvidence
        ? formatNoNightDriveViolationMessage(projectedEvidence)
        : undefined) ??
      (lane.message ? reprojectNoNightDriveTextWithBuffer(lane.message, bufferMinutes) : undefined);
    return {
      ...entry,
      laneBadges: entry.laneBadges.map((badge) =>
        badge.laneKey === 'executability' && badge.detail
          ? {
              ...badge,
              detail: reprojectNoNightDriveTextWithBuffer(badge.detail, bufferMinutes),
            }
          : badge,
      ),
      assessment: entry.assessment
        ? {
            ...entry.assessment,
            contractRequirement: `日落后 ${bufferMinutes} 分钟内结束驾驶`,
            lanes: {
              ...entry.assessment.lanes,
              executability: {
                ...lane,
                message,
                evidence: projectedEvidence ?? lane.evidence,
              },
            },
          }
        : entry.assessment,
    };
  });

  return {
    ...preview,
    affectedDayDetails,
    userSummary,
    diffBullets,
    constraintAssessments,
    adjustmentSummary: preview.adjustmentSummary
      ? reprojectNoNightDriveTextWithBuffer(preview.adjustmentSummary, bufferMinutes)
      : preview.adjustmentSummary,
  };
}

function extractSegmentLabelFromMessage(message: string | undefined): string | undefined {
  const trimmed = message?.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/([\p{L}\p{N}\s]+→[\p{L}\p{N}\s]+)/u);
  return match?.[1]?.trim();
}
