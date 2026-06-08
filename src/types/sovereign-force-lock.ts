import type { TripInstantiationResult } from '@/types/trip-instantiation';

/** PRD 3.15 · Sovereign Force Lock */

export type SovereignForceLockCrewMember = {
  userId: string;
  role: string;
  slotLabel: string;
  displayName: string;
  applicationId?: string | null;
};

export type SovereignForceLockDroppedSlot = {
  slotIndex: number;
  slotId: string;
  roleLabel: string;
  deficitTag: string;
};

export type SovereignForceLockVaultRecalc = {
  previousSplitBase: number;
  actualSplitBase: number;
  budgetPerPersonCents: number | null;
  summaryLine: string;
};

/** GET /match-square/posts/:id/force-lock/preview */
export type SovereignForceLockPreview = {
  postId: string;
  canForceLock: boolean;
  blockReason: string | null;
  currentCrew: SovereignForceLockCrewMember[];
  droppedOpenSlots: SovereignForceLockDroppedSlot[];
  physicalDeficits: string[];
  resilienceScore: number;
  vaultRecalc: SovereignForceLockVaultRecalc;
  pendingApplicationsToReject: number;
  confirmHeadline: string;
  confirmLines: string[];
};

export type SovereignForceLockRecord = {
  originalSlotsNeeded: number;
  effectiveSlotsNeeded: number;
  droppedOpenSlots: SovereignForceLockDroppedSlot[];
  physicalDeficits: string[];
  vaultRecalc: SovereignForceLockVaultRecalc;
  resilienceScore: number;
  pendingApplicationsRejected: number;
  taskRebalanceNote?: string | null;
  lockedAt?: string | null;
  note?: string | null;
};

/** POST /match-square/posts/:id/force-lock */
export type SovereignForceLockRequest = {
  note?: string;
  skipInstantiate?: boolean;
};

export type SovereignForceLockCommitResult = {
  postId: string;
  sovereignLock: SovereignForceLockRecord;
  rejectedApplicationIds: string[];
  instantiation: TripInstantiationResult | null;
  activeTripPath: string | null;
  dnaScheduled: boolean;
};
