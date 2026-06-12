import type { RecruitmentApplicationCard, RecruitmentPostCard } from '@/types/match-square';
import type { TripInstantiationPlan } from '@/types/trip-instantiation';
import {
  buildRosterFromPostAndApplications,
} from '@/lib/match-square-trip-roster';
import { cacheMatchSquarePartySource } from '@/lib/match-square-route-and-run';

const CONTEXT_KEY = 'tripnara_active_trip_context_v1';
const ROLLBACK_KEY = 'tripnara_active_trip_rollback_v1';

export type ActiveTripInstantiateContext = {
  tripId: string;
  postId: string;
  postSnapshot: RecruitmentPostCard;
  approvedApplications: RecruitmentApplicationCard[];
  plan: TripInstantiationPlan;
  instantiatedAt: string;
};

type RollbackStore = Record<string, import('@/types/active-trip-dashboard').RouteRollbackProposal | null>;

function readContextStore(): Record<string, ActiveTripInstantiateContext> {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ActiveTripInstantiateContext>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeContextStore(store: Record<string, ActiveTripInstantiateContext>): void {
  try {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function readRollbackStore(): RollbackStore {
  try {
    const raw = localStorage.getItem(ROLLBACK_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RollbackStore;
  } catch {
    return {};
  }
}

function writeRollbackStore(store: RollbackStore): void {
  try {
    localStorage.setItem(ROLLBACK_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function setActiveTripInstantiateContext(ctx: ActiveTripInstantiateContext): void {
  const store = readContextStore();
  store[ctx.tripId] = ctx;
  writeContextStore(store);
  const approved = ctx.approvedApplications.filter((a) => a.status === 'approved');
  cacheMatchSquarePartySource(ctx.tripId, {
    roster: buildRosterFromPostAndApplications(ctx.postSnapshot, approved),
    post: ctx.postSnapshot,
    applications: approved,
  });
}

export function getActiveTripInstantiateContext(
  tripId: string
): ActiveTripInstantiateContext | null {
  return readContextStore()[tripId] ?? null;
}

export function getPendingRollbackProposal(
  tripId: string
): import('@/types/active-trip-dashboard').RouteRollbackProposal | null {
  const store = readRollbackStore();
  const proposal = store[tripId];
  if (!proposal || proposal.status !== 'pending_member_confirm') return null;
  return proposal;
}

export function setPendingRollbackProposal(
  tripId: string,
  proposal: import('@/types/active-trip-dashboard').RouteRollbackProposal | null
): void {
  const store = readRollbackStore();
  store[tripId] = proposal;
  writeRollbackStore(store);
}

const COMMIT_KEY = 'tripnara_template_backflow_commit_v1';

type BackflowCommitStore = Record<string, { catalogId?: string; committedAt: string }>;

function readBackflowCommit(): BackflowCommitStore {
  try {
    const raw = localStorage.getItem(COMMIT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BackflowCommitStore;
  } catch {
    return {};
  }
}

function writeBackflowCommit(store: BackflowCommitStore): void {
  try {
    localStorage.setItem(COMMIT_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function getTemplateBackflowCommitted(tripId: string): boolean {
  return Boolean(readBackflowCommit()[tripId]);
}

export function setTemplateBackflowCommitted(
  tripId: string,
  catalogId?: string | null
): void {
  const store = readBackflowCommit();
  store[tripId] = { catalogId: catalogId ?? undefined, committedAt: new Date().toISOString() };
  writeBackflowCommit(store);
}

export function resolveCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string };
      if (parsed.id) return parsed.id;
    }
  } catch {
    /* ignore */
  }
  return 'current-user';
}
