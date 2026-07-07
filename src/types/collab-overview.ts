import type {
  CompatibilityScore,
  HighRiskAlert,
  OnboardingStatus,
} from '@/types/trip-decision-profiling';
import type { DomainCrossLevel, TripDomain } from '@/types/trip-domain-influence';

export type CollabTeamHealthStatus = 'healthy' | 'attention' | 'at_risk';

export type CollabOverviewTaskKind = 'flywheel' | 'negotiation';

export interface CollabOverviewCollaborator {
  id: string;
  userId: string;
  email?: string | null;
  displayName?: string | null;
  role: string;
}

export interface CollabOverviewTeamHealth {
  progressPercent: number;
  discussionCount: number;
  highFrictionCount: number;
  compatibilityBand?: 'high' | 'needs_negotiation' | 'high_risk';
  status: CollabTeamHealthStatus;
}

export interface CollabOverviewTaskItem {
  id: string;
  title: string;
  status: string;
  kind?: CollabOverviewTaskKind;
  assigneeLabel?: string | null;
  assigneeUserId?: string | null;
  templateId?: string;
  description?: string;
  decisionProblemId?: string;
  resolutionId?: string;
  actionPlanId?: string;
  domain?: TripDomain;
  crossLevel?: DomainCrossLevel;
  leaderDisplayName?: string | null;
  activeRoundId?: string | null;
  closesAt?: string | null;
}

export interface CollabOverviewDomainInfluence {
  memberCount: number;
  completionRate: number;
  rulesConfirmed: boolean;
  balanceWarningCount: number;
  allMembersClaimed: boolean;
}

export interface CollabOverviewSilentVote {
  id: string;
  title: string;
  status: string;
  closesAt?: string | null;
}

export interface CollabOverviewFrictionRadar {
  completionRate: number;
  highRiskAlerts: HighRiskAlert[];
  compatibility: CompatibilityScore;
  computedAt: string;
}

export interface CollabOverviewWishSummary {
  privateCount: number;
  mineCount: number;
  teamCount: number;
  agentEligibleCount: number;
}

export interface CollabOverviewTeamRef {
  teamId: string | null;
  fetchPath: string | null;
}

export interface CollabOverviewResponse {
  tripId: string;
  teamId?: string | null;
  team?: CollabOverviewTeamRef;
  memberCount: number;
  travelerCount?: number;
  collaborators: CollabOverviewCollaborator[];
  teamHealth: CollabOverviewTeamHealth;
  collaborativeTasks: CollabOverviewTaskItem[];
  collaborativeTaskCount: number;
  domainInfluence?: CollabOverviewDomainInfluence;
  openSilentVoteCount: number;
  silentVotes: CollabOverviewSilentVote[];
  profilingOnboarding?: OnboardingStatus;
  frictionRadar?: CollabOverviewFrictionRadar;
  wishSummary?: CollabOverviewWishSummary;
  generatedAt: string;
}

export interface CollabOverviewQuery {
  /** 逗号分隔；显式 include 优先于 preset */
  include?: string;
  /** v1.7：shell=members,health；full=全量 */
  preset?: 'shell' | 'full';
}
