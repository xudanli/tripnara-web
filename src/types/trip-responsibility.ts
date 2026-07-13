/**
 * 行程责任分配 SSOT
 * 每趟旅行明确 planning / execution / 确认 / 现场 / 紧急联系人
 */

export type TripResponsibilityRoleKey =
  | 'planningOwner'
  | 'executionOwner'
  | 'paymentApprover'
  | 'finalApprover'
  | 'onTripLeader'
  | 'emergencyContact';

export interface TripMemberRef {
  memberId?: string;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  /** 邀请码绑定前的占位标签，如「主联系人」 */
  inviteLabel?: string;
}

export interface TripResponsibilityOwners {
  planningOwner: TripMemberRef;
  executionOwner: TripMemberRef;
  paymentApprover: TripMemberRef;
  finalApprover: TripMemberRef;
  onTripLeader: TripMemberRef;
  emergencyContact: TripMemberRef;
}

export interface TripResponsibilityOwnersResponse {
  tripId: string;
  owners: TripResponsibilityOwners;
  updatedAt?: string;
  /** metadata 无 SSOT 时，由 collaborators + invites + stakeholders 推导 */
  inferred?: boolean;
}

export interface PatchTripResponsibilityOwnersRequest {
  owners: Partial<TripResponsibilityOwners>;
}

export const TRIP_RESPONSIBILITY_ROLE_LABELS: Record<TripResponsibilityRoleKey, string> = {
  planningOwner: '规划负责人（顾问）',
  executionOwner: '执行负责人',
  paymentApprover: '付款确认人',
  finalApprover: '最终确认人',
  onTripLeader: '现场领队',
  emergencyContact: '紧急联系人',
};

export const TRIP_RESPONSIBILITY_ROLE_HINTS: Record<TripResponsibilityRoleKey, string> = {
  planningOwner: '规划阶段主导：需求理解、方案设计、冲突处理',
  executionOwner: '执行阶段兜底：重大异常决策与服务协调',
  paymentApprover: '预算、付款、不可逆订单确认',
  finalApprover: '正式方案锁定与最终批准',
  onTripLeader: '现场组织、集合、安全与供应商协调',
  emergencyContact: '异常推送与紧急联络首选',
};
