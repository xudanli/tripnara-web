import type { ReunionStatus, SplitSessionStatus, SharedNodeType } from '@/types/in-trip-split';

export function splitSessionStatusLabel(status: SplitSessionStatus): string {
  const map: Record<SplitSessionStatus, string> = {
    proposed: '待确认',
    active: '探索中',
    reunited: '已汇合',
    cancelled: '已取消',
  };
  return map[status];
}

export function sharedNodeTypeLabel(type: SharedNodeType): string {
  const map: Record<SharedNodeType, string> = {
    meal: '用餐汇合',
    meeting_point: '集合点',
    activity: '共同活动',
    accommodation: '住宿',
  };
  return map[type] ?? type;
}

export function reunionStatusLabel(status: ReunionStatus): string {
  const map: Record<ReunionStatus, string> = {
    en_route: '前往汇合',
    arrived: '已到达',
    completed: '汇合完成',
  };
  return map[status];
}

/** 产品文案：正面框架，避免「拆队」 */
export const SPLIT_UI_COPY = {
  proposeTitle: '分组探索',
  proposeDescription: '两条路线并行，汇合时分享各自发现',
  executeCta: '开始分组探索',
  sharePlaceholder: '分享你们这一组的见闻…',
} as const;
