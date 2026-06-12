import type { ApplicationStatus, RecruitmentApplicationCard } from '@/types/match-square';

const STATUS_SNAPSHOT_KEY = 'match-square:application-status-snapshot';
const DISMISSED_KEY = 'match-square:dismissed-application-decisions';
const INITIALIZED_KEY = 'match-square:application-notifications-initialized';
const RECENT_DECISION_MS = 7 * 24 * 60 * 60 * 1000;

export function isDecidedApplicationStatus(status: ApplicationStatus): boolean {
  return status === 'approved' || status === 'rejected';
}

function readJsonRecord(key: string): Record<string, ApplicationStatus> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, ApplicationStatus>;
  } catch {
    return {};
  }
}

function writeJsonRecord(key: string, value: Record<string, ApplicationStatus>): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadApplicationStatusSnapshot(): Record<string, ApplicationStatus> {
  return readJsonRecord(STATUS_SNAPSHOT_KEY);
}

export function saveApplicationStatusSnapshot(
  snapshot: Record<string, ApplicationStatus>
): void {
  writeJsonRecord(STATUS_SNAPSHOT_KEY, snapshot);
}

export function loadDismissedApplicationDecisions(): Set<string> {
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

export function saveDismissedApplicationDecisions(ids: Set<string>): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function dismissApplicationDecision(applicationId: string): void {
  const dismissed = loadDismissedApplicationDecisions();
  dismissed.add(applicationId);
  saveDismissedApplicationDecisions(dismissed);
}

export function buildApplicationStatusSnapshot(
  applications: RecruitmentApplicationCard[]
): Record<string, ApplicationStatus> {
  return Object.fromEntries(applications.map((app) => [app.id, app.status]));
}

/** 首次启用时，将既有审批结果标为已读，避免历史申请刷屏 */
export function ensureApplicationNotificationsInitialized(
  applications: RecruitmentApplicationCard[]
): boolean {
  if (localStorage.getItem(INITIALIZED_KEY)) return false;

  saveApplicationStatusSnapshot(buildApplicationStatusSnapshot(applications));

  const dismissed = loadDismissedApplicationDecisions();
  for (const app of applications) {
    if (!isDecidedApplicationStatus(app.status)) continue;

    // 近 7 天内的审批仍通知，避免上线后吞掉刚通过的申请
    if (app.decidedAt) {
      const age = Date.now() - new Date(app.decidedAt).getTime();
      if (age <= RECENT_DECISION_MS) continue;
    }
    dismissed.add(app.id);
  }
  saveDismissedApplicationDecisions(dismissed);
  localStorage.setItem(INITIALIZED_KEY, '1');
  return true;
}

export function detectApplicationDecisionChanges(
  applications: RecruitmentApplicationCard[],
  previousSnapshot: Record<string, ApplicationStatus>
): RecruitmentApplicationCard[] {
  if (Object.keys(previousSnapshot).length === 0) return [];

  const dismissed = loadDismissedApplicationDecisions();
  const changes: RecruitmentApplicationCard[] = [];

  for (const app of applications) {
    if (!isDecidedApplicationStatus(app.status)) continue;
    if (dismissed.has(app.id)) continue;

    const prev = previousSnapshot[app.id];
    if (prev === 'pending') {
      changes.push(app);
      continue;
    }

    if (!prev && app.decidedAt) {
      const age = Date.now() - new Date(app.decidedAt).getTime();
      if (age <= RECENT_DECISION_MS) {
        changes.push(app);
      }
    }
  }

  return changes;
}

export function listUndismissedApplicationDecisions(
  applications: RecruitmentApplicationCard[]
): RecruitmentApplicationCard[] {
  const dismissed = loadDismissedApplicationDecisions();
  return applications.filter(
    (app) => isDecidedApplicationStatus(app.status) && !dismissed.has(app.id)
  );
}
