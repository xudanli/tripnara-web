/**
 * 跨模块统一成员角色（portal / team / advisor / onboarding）
 */

export type UnifiedTripMemberRole =
  | 'ADVISOR'
  | 'LEADER'
  | 'PAYER'
  | 'FINAL_CONFIRMER'
  | 'PRIMARY_CONTACT'
  | 'MEMBER'
  | 'GUARDIAN'
  | 'OBSERVER'
  | 'ORGANIZER';

export const UNIFIED_ROLE_LABELS: Record<UnifiedTripMemberRole, string> = {
  ADVISOR: '顾问',
  LEADER: '领队',
  PAYER: '付款人',
  FINAL_CONFIRMER: '最终确认人',
  PRIMARY_CONTACT: '主联系人',
  MEMBER: '成员',
  GUARDIAN: '代理人',
  OBSERVER: '观察者',
  ORGANIZER: '组织者',
};
