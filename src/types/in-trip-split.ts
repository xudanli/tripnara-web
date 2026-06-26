export type SplitTriggerReason =
  | 'manual_propose'
  | 'interest_divergence'
  | 'fatigue_gap'
  | 'relationship_tension'
  | 'free_time'
  | 'user_request';

export type SplitSessionStatus =
  | 'proposed'
  | 'active'
  | 'reunited'
  | 'cancelled';

export type SharedNodeType = 'meal' | 'meeting_point' | 'activity' | 'accommodation';

export type ReunionStatus = 'en_route' | 'arrived' | 'completed';

export interface SplitRouteItem {
  id: string;
  title: string;
  type: string;
  startTime?: string;
  location?: string;
}

export interface SplitGroup {
  groupId: string;
  label: string;
  memberIds: string[];
  route: SplitRouteItem[];
  staminaFit?: string;
  lastLocation?: { lat: number; lng: number; updatedAt?: string };
}

export interface SplitSharedNode {
  nodeId: string;
  type: SharedNodeType;
  title: string;
  time?: string;
  location?: string;
  participantScope?: string;
}

export interface SplitCostRouting {
  defaultRule: string;
  sharedNodeRule: string;
}

export interface SplitExperienceShare {
  groupId: string;
  text: string;
  createdAt: string;
  authorUserId?: string;
}

export interface SplitPartySessionSummary {
  id: string;
  tripId: string;
  status: SplitSessionStatus;
  triggerReason?: string;
  groupCount: number;
  sharedNodeCount: number;
  proposedAt?: string;
  executedAt?: string;
}

export interface SplitPartySessionDetail extends SplitPartySessionSummary {
  groups: SplitGroup[];
  sharedNodes: SplitSharedNode[];
  costRouting?: SplitCostRouting;
  experienceSharing?: SplitExperienceShare[];
  reunion?: {
    status?: ReunionStatus;
    meetingPoint?: string;
    plannedTime?: string;
    actualTime?: string;
  };
}

export interface SplitProposeInput {
  triggerReason?: SplitTriggerReason;
  forceSolo?: boolean;
}

export interface SplitShareInput {
  groupId: string;
  text: string;
}

export interface SplitReunionPatch {
  status: ReunionStatus;
  meetingPoint?: string;
}

export interface SplitLocationInput {
  groupId: string;
  lat: number;
  lng: number;
}
