import type { MyAppliedRecruitment } from './my-recruitments';
import type { RecruitmentPostStatus } from '@/types/match-square';
import { isRecruitmentTeamFull } from './team-roster-label';

const POST_STATUS_SNAPSHOT_KEY = 'match-square:team-formation-post-status-snapshot';
const DISMISSED_KEY = 'match-square:dismissed-team-formations';
const INITIALIZED_KEY = 'match-square:team-formation-notifications-initialized';
const RECENT_CLOSED_MS = 7 * 24 * 60 * 60 * 1000;

export type TeamFormationNotice = {
  postId: string;
  applicationId: string;
  destination: string;
  tripId?: string | null;
  teamFull: boolean;
  slotsRemaining: number;
};

function noticeFromAppliedEntry(entry: MyAppliedRecruitment): TeamFormationNotice {
  const remaining = entry.post.teamStatus?.slotsRemaining ?? 0;
  return {
    postId: entry.post.id,
    applicationId: entry.application.id,
    destination: entry.post.destination?.trim() || '该招募',
    tripId: entry.post.tripInstantiationResult?.tripId ?? null,
    teamFull: isRecruitmentTeamFull(entry.post),
    slotsRemaining: Math.max(0, remaining),
  };
}

function readPostStatusSnapshot(): Record<string, RecruitmentPostStatus> {
  try {
    const raw = localStorage.getItem(POST_STATUS_SNAPSHOT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, RecruitmentPostStatus>;
  } catch {
    return {};
  }
}

function writePostStatusSnapshot(snapshot: Record<string, RecruitmentPostStatus>): void {
  localStorage.setItem(POST_STATUS_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function loadTeamFormationPostStatusSnapshot(): Record<string, RecruitmentPostStatus> {
  return readPostStatusSnapshot();
}

export function saveTeamFormationPostStatusSnapshot(
  snapshot: Record<string, RecruitmentPostStatus>
): void {
  writePostStatusSnapshot(snapshot);
}

export function loadDismissedTeamFormations(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function saveDismissedTeamFormations(ids: Set<string>): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function dismissTeamFormation(postId: string): void {
  const dismissed = loadDismissedTeamFormations();
  dismissed.add(postId);
  saveDismissedTeamFormations(dismissed);
}

export function buildTeamFormationPostStatusSnapshot(
  applied: MyAppliedRecruitment[]
): Record<string, RecruitmentPostStatus> {
  const snapshot: Record<string, RecruitmentPostStatus> = {};
  for (const entry of applied) {
    snapshot[entry.post.id] = entry.post.status;
  }
  return snapshot;
}

function isRecentApprovedFormation(entry: MyAppliedRecruitment): boolean {
  const decidedAt = entry.application.decidedAt;
  if (!decidedAt) return false;
  const age = Date.now() - new Date(decidedAt).getTime();
  return age <= RECENT_CLOSED_MS;
}

/** 首次启用时，将既有 closed 招募标为已读，近 7 天内结束的仍通知 */
export function ensureTeamFormationNotificationsInitialized(
  applied: MyAppliedRecruitment[]
): boolean {
  if (localStorage.getItem(INITIALIZED_KEY)) return false;

  saveTeamFormationPostStatusSnapshot(buildTeamFormationPostStatusSnapshot(applied));

  const dismissed = loadDismissedTeamFormations();
  for (const entry of applied) {
    if (entry.post.status !== 'closed') continue;
    if (entry.application.status !== 'approved') continue;
    if (isRecentApprovedFormation(entry)) continue;
    dismissed.add(entry.post.id);
  }
  saveDismissedTeamFormations(dismissed);
  localStorage.setItem(INITIALIZED_KEY, '1');
  return true;
}

export function detectTeamFormationChanges(
  applied: MyAppliedRecruitment[],
  previousSnapshot: Record<string, RecruitmentPostStatus>
): TeamFormationNotice[] {
  if (Object.keys(previousSnapshot).length === 0) return [];

  const dismissed = loadDismissedTeamFormations();
  const notices: TeamFormationNotice[] = [];

  for (const entry of applied) {
    if (entry.application.status !== 'approved') continue;
    if (entry.post.status !== 'closed') continue;
    if (dismissed.has(entry.post.id)) continue;

    const prev = previousSnapshot[entry.post.id];
    if (prev && prev !== 'closed') {
      notices.push(noticeFromAppliedEntry(entry));
      continue;
    }

    if (!prev && isRecentApprovedFormation(entry)) {
      notices.push(noticeFromAppliedEntry(entry));
    }
  }

  return notices;
}

export function listUndismissedTeamFormations(
  applied: MyAppliedRecruitment[]
): TeamFormationNotice[] {
  const dismissed = loadDismissedTeamFormations();
  return applied
    .filter(
      (entry) =>
        entry.application.status === 'approved' &&
        entry.post.status === 'closed' &&
        !dismissed.has(entry.post.id)
    )
    .map((entry) => noticeFromAppliedEntry(entry));
}
