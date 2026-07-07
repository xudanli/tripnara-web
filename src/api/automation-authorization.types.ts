import type { AutomationDefaultLevel } from '@/api/travel-status.types';
import type {
  TripConstraintsChangeStrategy,
  TripConstraintsContract,
  TripConstraintsTeamGovernance,
} from '@/types/trip-constraints';
import type {
  TravelStatusAiCompletedWork,
  TravelStatusAutomation,
} from '@/api/travel-status.types';

export type AutomationPermissionTier = 'AUTO' | 'ASK' | 'DENY';

export type AutomationAuthorizationScope = 'TRIP' | 'USER_TEMPLATE';

export type AutomationGroupKey =
  | 'MONITORING'
  | 'TIME_ROUTE'
  | 'ACTIVITY'
  | 'BUDGET_BOOKING'
  | 'SAFETY'
  | 'TEAM_PRIVACY'
  | string;

export interface AutomationExecutionConditions {
  onlyUnbooked?: boolean;
  excludeCoreActivities?: boolean;
  noCrossDay?: boolean;
  noBudgetIncrease?: boolean;
  noDriveTimeIncrease?: boolean;
  maxItemsPerChange?: number;
  minMinutesBeforeActivity?: number;
  notifyOnApply?: boolean;
  teamCanUndo?: boolean;
}

export interface AutomationCatalogAction {
  key: string;
  label: string;
  effectiveTier: AutomationPermissionTier;
  effectiveTierLabel?: string;
  defaultTier?: AutomationPermissionTier;
  coldStart?: boolean;
  userOverride?: AutomationPermissionTier | null;
  floorTier?: AutomationPermissionTier;
}

export interface AutomationGroupSummary {
  group: AutomationGroupKey;
  label: string;
  autoCount: number;
  askCount: number;
  denyCount: number;
  actions: AutomationCatalogAction[];
}

export interface AutomationAuthorizationCatalog {
  schemaId?: string;
  coldStartActionKeys?: string[];
  groups: AutomationGroupSummary[];
}

export interface AutomationPolicyPatch {
  defaultLevel?: AutomationDefaultLevel;
  actionOverrides?: Record<string, AutomationPermissionTier>;
  executionConditions?: Record<string, AutomationExecutionConditions>;
  autoAllowed?: string[];
  confirmationRequired?: string[];
}

export interface AutomationAuthorizationView {
  schemaId?: string;
  tripId: string;
  scope: AutomationAuthorizationScope;
  constraintsVersion: number;
  automationPaused: boolean;
  contract: TripConstraintsContract;
  travelStatus: {
    automation: TravelStatusAutomation;
    aiCompletedWork: TravelStatusAiCompletedWork;
  };
  userTemplate?: UserAutomationAuthorizationTemplate | null;
}

export interface PatchAutomationAuthorizationBody {
  scope?: AutomationAuthorizationScope;
  constraintsVersion?: number;
  automationPaused?: boolean;
  automation?: AutomationPolicyPatch;
  changeStrategy?: Partial<TripConstraintsChangeStrategy>;
  teamGovernance?: Partial<TripConstraintsTeamGovernance>;
}

export interface PatchAutomationAuthorizationResponse {
  constraintsVersion?: number;
  contract?: TripConstraintsContract;
  scope?: AutomationAuthorizationScope;
  automationPaused?: boolean;
}

export interface PauseAutomationAuthorizationBody {
  paused: boolean;
  constraintsVersion?: number;
}

export interface UndoAiCompletedWorkResponse {
  submit?: { problemId?: string; status?: string; nextStep?: string };
  apply?: { revalidation?: { status?: string } };
  rolledBackLogId?: string;
}

export interface UserAutomationAuthorizationTemplate {
  schemaId?: string;
  automation?: AutomationPolicyPatch;
  changeStrategy?: Partial<TripConstraintsChangeStrategy>;
  updatedAt?: string;
}

export interface PutUserAutomationAuthorizationTemplateBody {
  automation?: AutomationPolicyPatch;
  changeStrategy?: Partial<TripConstraintsChangeStrategy>;
}

export interface ContextSnapshotMember {
  id?: string;
  name?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
}

export interface ContextSnapshotMembersBlock {
  count?: number;
  travelers?: ContextSnapshotMember[];
}

export interface TeamGovernanceRule {
  topic?: string;
  rule?: string;
  thresholdPct?: number;
  label?: string;
  description?: string;
  key?: string;
}
