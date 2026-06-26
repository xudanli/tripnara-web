/** 8 大规划领域 */
export type TripDomain =
  | 'destination_route'
  | 'main_transport'
  | 'accommodation'
  | 'activities'
  | 'dining'
  | 'local_transport'
  | 'shopping'
  | 'insurance_visa';

export type DomainCrossLevel = 'low' | 'medium' | 'high';

export type DomainWeightSource = 'computed' | 'negotiation' | 'manual';

export type DomainClaimSource = 'explicit' | 'recommended';

export interface DomainDecisionRule {
  crossLevel: DomainCrossLevel;
  ruleLabelZh: string;
  expertCanDecideAlone: boolean;
  requiresTeamVote: boolean;
  requiresFullTeamDiscussion: boolean;
}

export interface DomainClaim {
  id: string;
  userId: string;
  displayName: string;
  claimSource: DomainClaimSource;
  selfScore: number;
  note: string | null;
  endorsementCount: number;
  endorsementTotal: number;
  endorsedByCurrentUser: boolean;
}

export interface DomainWeightEntry {
  userId: string;
  displayName: string;
  weight: number;
  weightPercent: number;
  isLeader: boolean;
  selfScore: number;
  peerTrustScore: number;
  stakeScore: number;
  payerScore: number;
  endorsementCount: number;
  claimSource: DomainClaimSource;
}

export interface DomainInfluenceItem {
  domain: TripDomain;
  domainLabel: string;
  unclaimed: boolean;
  leaderUserId: string | null;
  leaderDisplayName: string | null;
  weightSource: DomainWeightSource;
  impactHints?: string[];
  decisionRule: DomainDecisionRule;
  claims: DomainClaim[];
  weights: DomainWeightEntry[];
}

export interface DomainBalanceWarning {
  userId: string;
  displayName: string;
  message: string;
}

export interface DomainInfluenceSnapshot {
  tripId: string;
  memberCount: number;
  completionRate: number;
  allMembersClaimed: boolean;
  rulesConfirmed: boolean;
  rulesConfirmedAt: string | null;
  balanceWarnings: DomainBalanceWarning[];
  domains: DomainInfluenceItem[];
}

export interface DomainRecommendation {
  domain: TripDomain;
  domainLabel: string;
  score: number;
  reason: string;
}

export interface DomainRecommendationsResponse {
  items: DomainRecommendation[];
}

export interface CreateDomainClaimRequest {
  domain: TripDomain;
  selfScore?: number;
  note?: string;
  claimSource?: DomainClaimSource;
}

export interface EndorseDomainClaimRequest {
  domain: TripDomain;
  claimUserId: string;
}

export interface UpdateDomainWeightsRequest {
  domain: TripDomain;
  source?: 'negotiation';
  weights: Array<{ userId: string; weight: number }>;
}

export interface BulkUpdateDomainWeightsRequest {
  domains: Array<{
    domain: TripDomain;
    weights: Array<{ userId: string; weight: number }>;
  }>;
}

export interface ConfirmDomainRulesRequest {
  note?: string;
}

export interface ConfirmDomainRulesResponse {
  confirmedAt: string;
}

export interface WithdrawDomainClaimResponse {
  withdrawn: boolean;
}

export interface EndorseDomainClaimResponse {
  endorsementCount: number;
}

/** 工作台右侧栏精简视图 */
export interface DomainWorkbenchWeight {
  displayName: string;
  userId: string;
  percent: number;
}

export interface DomainWorkbenchEndorsementSummary {
  displayName: string;
  endorsed: string;
}

export interface DomainWorkbenchDomain {
  domain: TripDomain;
  label: string;
  crossLevel: DomainCrossLevel;
  ruleLabel: string;
  unclaimed: boolean;
  leader: string | null;
  leaderUserId: string | null;
  weights: DomainWorkbenchWeight[];
  endorsementSummary: DomainWorkbenchEndorsementSummary[];
}

export interface DomainWorkbenchSidebar {
  tripId: string;
  completionRate: number;
  rulesConfirmed: boolean;
  balanceWarnings: DomainBalanceWarning[];
  domains: DomainWorkbenchDomain[];
}

export interface PrivateWishConstraint {
  wishId: string;
  importance: number;
  text: string;
  structuredHints?: Record<string, unknown>;
  memberSlot: number;
}

export interface DomainDecisionBrief {
  domain: TripDomain;
  domainLabel: string;
  crossLevel: DomainCrossLevel;
  leaderUserIds: string[];
  weights: DomainWeightEntry[];
  privateWishCount: number;
  privateWishConstraints: PrivateWishConstraint[];
}
