import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';

export const BUFFER_REPAIR_ACTION_TYPES = [
  'add_buffer',
  'add_buffer_minutes',
  'shift_departure',
  'insert_rest_day',
] as const;

export type BufferRepairActionType = (typeof BUFFER_REPAIR_ACTION_TYPES)[number];

/** BE 0.2.0 规范 optionId */
export const BUFFER_ADD_OPTION_IDS: Record<number, string> = {
  30: 'buffer-add-30',
  60: 'buffer-add-60',
};

export function isBufferRepairActionType(
  actionType: string | undefined,
): actionType is BufferRepairActionType {
  return BUFFER_REPAIR_ACTION_TYPES.includes(actionType as BufferRepairActionType);
}

export function isBufferRepairOption(option: FeasibilityRepairOptionDto): boolean {
  return isBufferRepairActionType(option.actionType);
}

/** add_buffer + bufferMinutes，或 add_buffer_minutes — 分钟级顺延（非插日） */
export function isAddBufferMinuteOption(option: FeasibilityRepairOptionDto): boolean {
  if (option.actionType === 'add_buffer_minutes') return true;
  if (option.actionType !== 'add_buffer') return false;
  if (option.payload?.bufferMinutes != null) return true;
  if (option.id === BUFFER_ADD_OPTION_IDS[30] || option.id === BUFFER_ADD_OPTION_IDS[60]) {
    return true;
  }
  return false;
}

/** optionId === add_buffer 且无 bufferMinutes → 插入缓冲日 */
export function isInsertBufferDayOption(option: FeasibilityRepairOptionDto): boolean {
  if (option.actionType === 'add_buffer_minutes' || option.actionType === 'shift_departure') {
    return false;
  }
  if (option.actionType === 'insert_rest_day') return true;
  if (option.actionType === 'add_buffer') {
    if (option.payload?.bufferMinutes != null) return false;
    return (
      option.id === 'add_buffer' ||
      option.payload?.beforeDayNumber != null ||
      option.payload?.afterDayNumber != null
    );
  }
  return option.id === 'add_buffer';
}

export function isMinuteBufferOption(option: FeasibilityRepairOptionDto): boolean {
  return isAddBufferMinuteOption(option);
}

/** 跨天交通 / 缓冲不足类 issue — 可展示一键缓冲修复 */
export function isBufferOrTravelRepairIssue(issue: FeasibilityIssueDto): boolean {
  if (issue.uiHints?.primaryAction === 'add_buffer') return true;
  if (
    issue.issueKind === 'inter_day_travel' ||
    issue.issueKind === 'same_day_travel' ||
    issue.issueKind === 'buffer_insufficient'
  ) {
    return true;
  }
  if (issue.conflictType === 'BUFFER_INSUFFICIENT') return true;
  const text = `${issue.title ?? ''} ${issue.message ?? ''} ${issue.actionRequired ?? ''}`;
  return /缓冲|buffer|gap|衔接过紧|时间不足/i.test(text);
}

export function pickBufferRepairOptions(
  options: FeasibilityRepairOptionDto[] | undefined,
): FeasibilityRepairOptionDto[] {
  return (options ?? []).filter(isBufferRepairOption);
}

/** 同一 option 在 issue + proofs 双写时只保留一条（优先靠前：issue.repairOptions） */
export function bufferRepairOptionDedupeKey(option: FeasibilityRepairOptionDto): string {
  if (isInsertBufferDayOption(option)) {
    const day = option.payload?.beforeDayNumber ?? option.payload?.afterDayNumber ?? '';
    return `insert_rest_day|${day}`;
  }
  if (isAddBufferMinuteOption(option)) {
    const minutes =
      option.payload?.bufferMinutes ??
      (option.id === BUFFER_ADD_OPTION_IDS[30] ? 30 : option.id === BUFFER_ADD_OPTION_IDS[60] ? 60 : undefined);
    if (minutes != null) return `buffer_minutes|${minutes}`;
  }
  if (option.actionType === 'shift_departure') {
    const shift = option.payload?.shiftMinutes ?? option.payload?.bufferMinutes ?? '';
    const target = option.payload?.targetItemId ?? option.payload?.itemId ?? '';
    return `shift_departure|${shift}|${target}`;
  }
  if (option.id?.trim()) return option.id.trim();
  const minutes = option.payload?.bufferMinutes ?? option.payload?.shiftMinutes;
  const day = option.payload?.beforeDayNumber ?? option.payload?.afterDayNumber;
  return [option.actionType ?? '', minutes ?? '', day ?? '', option.label ?? ''].join('|');
}

export function dedupeBufferRepairOptions(
  options: FeasibilityRepairOptionDto[],
): FeasibilityRepairOptionDto[] {
  const seen = new Set<string>();
  const out: FeasibilityRepairOptionDto[] = [];
  for (const opt of options) {
    const key = bufferRepairOptionDedupeKey(opt);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(opt);
  }
  return out;
}

function bufferOptionRank(option: FeasibilityRepairOptionDto): number {
  if (isInsertBufferDayOption(option)) return 0;
  if (isAddBufferMinuteOption(option)) return 1;
  if (option.actionType === 'shift_departure') return 2;
  return 3;
}

export function sortBufferRepairOptions(
  options: FeasibilityRepairOptionDto[],
): FeasibilityRepairOptionDto[] {
  return [...options].sort((a, b) => {
    const rankDiff = bufferOptionRank(a) - bufferOptionRank(b);
    if (rankDiff !== 0) return rankDiff;
    const minutesA = a.payload?.bufferMinutes ?? a.payload?.shiftMinutes ?? 0;
    const minutesB = b.payload?.bufferMinutes ?? b.payload?.shiftMinutes ?? 0;
    return minutesA - minutesB;
  });
}

/** issue + proofs 内嵌 repair / planB 选项 */
export function collectBufferRepairOptionsFromIssue(
  issue: FeasibilityIssueDto,
): FeasibilityRepairOptionDto[] {
  const pools: FeasibilityRepairOptionDto[] = [
    ...(issue.repairOptions ?? []),
    ...(issue.proofs ?? []).flatMap((proof) => [
      ...(proof.repairOptions ?? []),
      ...(proof.planBOptions ?? []),
    ]),
  ];
  return sortBufferRepairOptions(dedupeBufferRepairOptions(pickBufferRepairOptions(pools)));
}

export function findInsertBufferDayOption(
  options: FeasibilityRepairOptionDto[],
): FeasibilityRepairOptionDto | undefined {
  return options.find(isInsertBufferDayOption);
}

export function buildSyntheticInsertBufferDayOption(
  issue?: FeasibilityIssueDto,
): FeasibilityRepairOptionDto {
  const embedded = issue ? findInsertBufferDayOption(collectBufferRepairOptionsFromIssue(issue)) : undefined;
  if (embedded) return embedded;
  return {
    id: 'add_buffer',
    label: '插入缓冲日',
    actionType: 'insert_rest_day',
    payload: { strategy: 'insert_rest' },
  };
}

/** handoff 0.2.0：buffer-add-30/60 或 add_buffer/add_buffer_minutes + bufferMinutes */
export function findBufferOptionByMinutes(
  options: FeasibilityRepairOptionDto[],
  minutes: number,
): FeasibilityRepairOptionDto | undefined {
  const canonicalId = BUFFER_ADD_OPTION_IDS[minutes];
  if (canonicalId) {
    const byId = options.find((opt) => opt.id === canonicalId);
    if (byId) return byId;
  }
  return options.find(
    (opt) =>
      isAddBufferMinuteOption(opt) &&
      (opt.payload?.bufferMinutes === minutes ||
        new RegExp(`\\b${minutes}\\s*分钟`).test(`${opt.label} ${opt.description ?? ''}`)),
  );
}

export function findShiftDepartureOption(
  options: FeasibilityRepairOptionDto[],
): FeasibilityRepairOptionDto | undefined {
  return options.find((opt) => opt.actionType === 'shift_departure');
}

/** 后端未返回 options 时的展示用快捷项（与 BE 30/60 主路径一致） */
export const BUFFER_REPAIR_QUICK_ACTIONS = [
  {
    key: 'insert-buffer-day',
    label: '插入缓冲日',
    actionType: 'insert_rest_day' as const,
  },
  { key: 'buffer-15', label: '加 15 分钟缓冲', minutes: 15, actionType: 'add_buffer_minutes' as const },
  { key: 'buffer-30', label: '加 30 分钟缓冲', minutes: 30, actionType: 'add_buffer' as const },
  { key: 'buffer-60', label: '加 60 分钟缓冲', minutes: 60, actionType: 'add_buffer' as const },
  { key: 'shift', label: '推迟出发', actionType: 'shift_departure' as const },
] as const;

export function prefersInsertBufferDayPrimary(issue: FeasibilityIssueDto): boolean {
  if (issue.uiHints?.primaryAction === 'add_buffer') {
    const opts = collectBufferRepairOptionsFromIssue(issue);
    if (opts.length === 0) return true;
    return opts.every(isInsertBufferDayOption);
  }
  const opts = collectBufferRepairOptionsFromIssue(issue);
  if (opts.length === 0) return false;
  return opts.every(isInsertBufferDayOption);
}

export function hasMinuteOrShiftBufferOptions(issue: FeasibilityIssueDto): boolean {
  return collectBufferRepairOptionsFromIssue(issue).some(
    (opt) => isAddBufferMinuteOption(opt) || opt.actionType === 'shift_departure',
  );
}
