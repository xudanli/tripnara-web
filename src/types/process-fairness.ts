import type { TripDomain } from '@/types/trip-domain-influence';

/** 偏好轮次 decisionNode（API 发起用） */
export type PreferenceDecisionNode = 'destination' | 'accommodation' | 'activity' | 'budget';

/** 轮次状态机 */
export type PreferenceRoundStatus = 'collecting' | 'synthesizing' | 'closed';

export type UtteranceModality = 'text' | 'voice' | 'image' | 'link';

export interface PreferenceRoundUtterance {
  id: string;
  userId: string;
  displayName: string;
  turnIndex: number;
  modality: UtteranceModality;
  content: string;
  reason: string | null;
  viaProxy: boolean;
  createdAt: string;
}

export interface PreferenceRoundHeardRate {
  userId: string;
  displayName: string;
  heardRate: number;
}

export interface PreferenceRoundIntervention {
  targetUserId: string;
  displayName: string;
  heardRate: number;
  messageCN: string;
}

export interface PreferenceRoundDetail {
  id: string;
  tripId: string;
  domain: TripDomain;
  decisionNode: PreferenceDecisionNode | string;
  status: PreferenceRoundStatus;
  statusLabel: string;
  turnOrder: string[];
  currentTurn: number;
  currentSpeakerUserId: string | null;
  currentSpeakerDisplayName: string | null;
  closesAt: string | null;
  closedAt: string | null;
  utterances: PreferenceRoundUtterance[];
  heardRates: PreferenceRoundHeardRate[] | null;
  interventions: PreferenceRoundIntervention[];
  canSpeak: boolean;
  canSubmitHeardVotes: boolean;
  myHeardVotesSubmitted: boolean;
}

export interface PreferenceRoundListItem {
  id: string;
  tripId: string;
  domain: TripDomain;
  decisionNode: string;
  status: PreferenceRoundStatus;
  statusLabel: string;
  closesAt: string | null;
  utteranceCount: number;
  memberCount: number;
}

export interface PreferenceRoundListResponse {
  items: PreferenceRoundListItem[];
  count: number;
}

export interface ActivePreferenceRoundResponse {
  domain: string;
  activeRoundId: string | null;
}

export interface CreatePreferenceRoundRequest {
  decisionNode: PreferenceDecisionNode;
  turnOrder?: string[];
  closesAt?: string;
}

export interface SubmitUtteranceRequest {
  modality: UtteranceModality;
  content: string;
  reason?: string;
  viaProxy?: boolean;
}

export interface HeardVoteEntry {
  targetUserId: string;
  heard: boolean;
}

export interface SubmitHeardVotesRequest {
  votes: HeardVoteEntry[];
}

export interface VoiceGuardMember {
  userId: string;
  displayName: string;
  preferenceSubmits: number;
  voteParticipations: number;
  discussionUtterances: number;
  consecutiveSilentRounds: number;
  lastSpokeAt: string | null;
  engagementScore: number;
}

export interface VoiceGuardIntervention {
  userId: string;
  displayName: string;
  reason: string;
  privateMessageCN: string;
  groupMessageCN: string;
  severity: 'low' | 'medium' | 'high' | string;
}

export interface VoiceGuardStatus {
  tripId: string;
  memberCount: number;
  averageEngagementScore: number;
  members: VoiceGuardMember[];
  interventions: VoiceGuardIntervention[];
}

/** route_and_run / 偏好轮次编排状态：SCAFFOLD=讨论框架（单人），ACTIVE=Round Robin 已开启 */
export type ProcessFairnessStatus = 'SCAFFOLD' | 'ACTIVE' | string;

/** route_and_run payload.process_fairness */
export interface ProcessFairnessClientNavigation {
  route: 'structured_negotiation' | string;
  tripId: string;
  roundId: string;
  domain: string;
}

export interface ProcessFairnessPayload {
  triggered: boolean;
  /** SCAFFOLD：成功返回讨论框架（单人行程）；ACTIVE：已开启 Round Robin（≥2 成员） */
  status?: ProcessFairnessStatus;
  decisionNode?: PreferenceDecisionNode | string;
  roundId?: string;
  round?: Partial<PreferenceRoundDetail>;
  agentIntroZh?: string;
  clientNavigation?: ProcessFairnessClientNavigation;
}
