export type SilentVoteStatus = 'draft' | 'open' | 'closed';

export type SilentVoteIntensity = 1 | 2 | 3 | 4 | 5;

export interface SilentVoteOption {
  id: string;
  label: string;
  planId?: string;
  summaryRef?: string;
}

export interface SilentVoteIntensityBuckets {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
}

export interface SilentVoteOptionDistribution {
  optionId: string;
  label: string;
  count: number;
  share: number;
}

export interface SilentVoteIntensityHeatmapRow {
  optionId: string;
  label: string;
  buckets: SilentVoteIntensityBuckets;
  meanIntensity: number;
  weightedScore: number;
}

export interface SilentVoteDiscussionHint {
  type: 'HIGH_INTENSITY_MINORITY';
  optionId: string;
  optionLabel: string;
  minorityShare: number;
  highIntensityCount: number;
  messageCN: string;
  severity: 'medium' | 'high';
}

export interface SilentVoteAggregate {
  voteId: string;
  status: SilentVoteStatus;
  eligibleCount: number;
  submittedCount: number;
  participationRate: number;
  kAnonymityApplied: boolean;
  optionDistribution: SilentVoteOptionDistribution[] | null;
  intensityHeatmap: SilentVoteIntensityHeatmapRow[] | null;
  overallIntensity: {
    mean: number;
    buckets: SilentVoteIntensityBuckets;
  } | null;
  discussionHints: SilentVoteDiscussionHint[];
}

export interface SilentVoteDetail {
  id: string;
  tripId: string;
  createdBy: string;
  title: string;
  question: string | null;
  status: SilentVoteStatus;
  options: SilentVoteOption[];
  closesAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  myBallotSubmitted: boolean;
  aggregate: SilentVoteAggregate;
}

export interface SilentVoteListResponse {
  items: SilentVoteDetail[];
  count: number;
}

export interface SilentVoteBallot {
  optionId: string;
  intensity: SilentVoteIntensity;
  submittedAt: string;
  updatedAt: string;
}

export interface SilentVoteBallotMineResponse {
  submitted: boolean;
  ballot?: SilentVoteBallot;
}

export interface CreateSilentVoteFromCompareRequest {
  planIds: string[];
  title?: string;
  question?: string;
  autoOpen?: boolean;
}

export interface CreateSilentVoteOptionInput {
  id: string;
  label: string;
  planId?: string;
  summaryRef?: string;
}

export interface CreateSilentVoteRequest {
  title: string;
  question?: string;
  autoOpen?: boolean;
  options: CreateSilentVoteOptionInput[];
}

export interface SubmitSilentVoteBallotRequest {
  optionId: string;
  intensity: SilentVoteIntensity;
}
