/** L2 物理门 — actionExecutionPreview 用户向文案 */

const ACTION_ID_LABEL_ZH: Record<string, string> = {
  ITINERARY_ADJUST: '调整行程',
  ROUTE_REOPTIMIZE: '重新优化路线',
  TEMPORAL_SHIFT: '平移出发时间',
  BOOKING_AMEND: '改签预订',
};

const ACTION_ID_LABEL_EN: Record<string, string> = {
  ITINERARY_ADJUST: 'Adjust itinerary',
  ROUTE_REOPTIMIZE: 'Re-optimize route',
  TEMPORAL_SHIFT: 'Shift departure time',
  BOOKING_AMEND: 'Amend booking',
};

const STATUS_LABEL_ZH: Record<string, string> = {
  blocked: '无法执行',
  feasible: '可执行',
  requires_confirmation: '需您确认',
};

const STATUS_LABEL_EN: Record<string, string> = {
  blocked: 'Blocked',
  feasible: 'Feasible',
  requires_confirmation: 'Needs confirmation',
};

const INTERRUPT_MODE_ZH: Record<string, string> = {
  INTERRUPT_WITH_SUGGESTION: '建议型调整',
};

const INTERRUPT_MODE_EN: Record<string, string> = {
  INTERRUPT_WITH_SUGGESTION: 'Suggested adjustment',
};

export function formatActionPreviewTitle(actionId: string, isZh: boolean): string {
  const key = actionId.trim().toUpperCase();
  const map = isZh ? ACTION_ID_LABEL_ZH : ACTION_ID_LABEL_EN;
  return map[key] ?? actionId;
}

export function formatActionPreviewStatus(status: string | undefined, isZh: boolean): string {
  if (!status) return '—';
  const key = status.toLowerCase();
  const map = isZh ? STATUS_LABEL_ZH : STATUS_LABEL_EN;
  return map[key] ?? status;
}

export function formatInterruptMode(mode: string | undefined, isZh: boolean): string | undefined {
  if (!mode) return undefined;
  const map = isZh ? INTERRUPT_MODE_ZH : INTERRUPT_MODE_EN;
  return map[mode] ?? mode;
}
