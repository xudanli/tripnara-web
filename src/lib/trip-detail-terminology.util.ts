/**
 * 行程详情页 · 统一术语
 * @see docs/trip-detail-tab-responsibility-matrix.md
 */

/** 用户可见文案（禁止同义混用） */
export const TRIP_DETAIL_TERMS = {
  /** 必须拍板 · travel-status openDecisions · gate NEED_CONFIRM */
  openDecision: {
    short: '待你决定',
    description: '必须拍板 · 接受后将更新有效行程',
  },
  /** 非阻塞确认 · travel-status pendingVerification / timeline pendingConfirmationCount */
  suggestedConfirm: {
    short: '建议确认',
    description: '非阻塞 · 确认后提升行程把握度',
  },
  /** 协作成员未确认 */
  memberPending: {
    short: '待确认',
    scope: '成员协作',
  },
  /** 预订/住宿状态 */
  bookingPending: {
    short: '待确认',
    scope: '预订状态',
  },
  /** 文件库缺资料 */
  filePending: {
    short: '待补充',
    scope: '行程凭证',
  },
  /** 监控扫描 */
  monitoringAlert: {
    short: '监控告警',
    description: '天气/路况/票务等外部变化',
  },
} as const;

/** Tab 与跨页跳转文案（避免「决策中心/决策记录」混用） */
export const TRIP_DETAIL_NAV = {
  decisionHistory: '决策历史',
  openOverviewDecisions: '查看待办',
  openOverviewMonitoring: '查看监控',
  goOverviewToHandle: '前往概览处理',
  accommodation: '住宿',
  activities: '活动',
  budget: '预算',
  members: '成员',
  files: '文件',
} as const;

export type TripDetailTermKey = keyof typeof TRIP_DETAIL_TERMS;

/** 时间轴 BFF · pendingConfirmationCount 副文案 */
export function formatSuggestedConfirmSubtext(count: number): string {
  if (count <= 0) return '暂无待处理';
  return `${count} 项${TRIP_DETAIL_TERMS.suggestedConfirm.short}`;
}

/** 时间轴 stats 行 · 组合副文案 */
export function formatTimelinePendingSubtext(input: {
  pendingConfirmationCount: number;
  conflictCount: number;
  filesPendingCount?: number;
}): string {
  const parts: string[] = [];
  if (input.pendingConfirmationCount > 0) {
    parts.push(formatSuggestedConfirmSubtext(input.pendingConfirmationCount));
  }
  if (input.conflictCount > 0) {
    parts.push(`${input.conflictCount} 项冲突`);
  }
  if (input.filesPendingCount != null && input.filesPendingCount > 0) {
    parts.push(`${input.filesPendingCount} 份${TRIP_DETAIL_TERMS.filePending.short}`);
  }
  if (parts.length === 0) return '暂无待处理';
  return parts.join(' · ');
}
