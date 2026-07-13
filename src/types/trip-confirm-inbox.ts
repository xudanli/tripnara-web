/**
 * 成员确认 inbox — 按 confirmScope 路由
 */

export type ConfirmScope =
  | 'AI_AUTO'
  | 'ADVISOR_DIRECT'
  | 'PAYER'
  | 'AFFECTED_MEMBERS'
  | 'PAYER_AND_MEMBERS'
  | 'ALL_MEMBERS';

export type MemberConfirmPhase = 'planning' | 'execution' | 'completion';

export type MemberConfirmStatus = 'PENDING' | 'COMPLETED' | 'DISMISSED';

export interface MemberConfirmInboxItem {
  id: string;
  title: string;
  summary?: string;
  confirmScope: ConfirmScope;
  phase: MemberConfirmPhase;
  status: MemberConfirmStatus;
  dueAt?: string;
  actionHref?: string;
  /** 是否阻塞成员其他操作 */
  blocking?: boolean;
}

export interface MemberConfirmInboxResponse {
  tripId?: string;
  items: MemberConfirmInboxItem[];
  pendingCount: number;
}

export const CONFIRM_SCOPE_LABELS: Record<ConfirmScope, string> = {
  AI_AUTO: '已自动处理',
  ADVISOR_DIRECT: '顾问已调整',
  PAYER: '待付款人批准',
  AFFECTED_MEMBERS: '待你确认',
  PAYER_AND_MEMBERS: '待付款人与相关成员确认',
  ALL_MEMBERS: '待全员确认',
};

export const CONFIRM_SCOPE_MEMBER_VISIBLE: ConfirmScope[] = [
  'AFFECTED_MEMBERS',
  'PAYER_AND_MEMBERS',
  'ALL_MEMBERS',
  'PAYER',
];
