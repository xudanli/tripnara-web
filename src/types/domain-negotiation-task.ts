import type { DomainCrossLevel, TripDomain } from '@/types/trip-domain-influence';

/** 结构化协商任务状态 */
export type DomainNegotiationTaskStatus = 'pending' | 'in_discussion' | 'consensus_reached';

export interface DomainNegotiationTask {
  id: string;
  domain: TripDomain;
  title: string;
  status: DomainNegotiationTaskStatus;
  statusLabel: string;
  crossLevel: DomainCrossLevel;
  closesAt: string | null;
  description?: string;
  /** 讨论中时关联的偏好轮次 ID */
  activeRoundId?: string | null;
  claimCount?: number;
  leaderDisplayName?: string;
  endorsementSummary?: string;
  weightSource?: string;
}

export interface DomainNegotiationTasksResponse {
  tasks: DomainNegotiationTask[];
}
