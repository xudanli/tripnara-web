import type { ApplicationStatus } from '@/types/match-square';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: '已申请 · 待审批',
  approved: '已通过入队',
  rejected: '申请未通过',
  withdrawn: '已撤回申请',
};

const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = ['pending', 'approved'];

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (
    value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'withdrawn'
  );
}

/** 后端 status 别名 → 前端 ApplicationStatus */
export function normalizeApplicationStatus(raw: unknown): ApplicationStatus {
  if (typeof raw !== 'string') return 'pending';
  if (isApplicationStatus(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower === 'awaiting_review' || lower === 'awaiting_approval' || lower === 'submitted') {
    return 'pending';
  }
  if (lower === 'accepted') return 'approved';
  if (lower === 'declined' || lower === 'denied') return 'rejected';
  return 'pending';
}

export function isPendingApplicationStatus(status: ApplicationStatus): boolean {
  return status === 'pending';
}

export function filterPendingApplications<T extends { status: ApplicationStatus }>(items: T[]): T[] {
  return items.filter((item) => isPendingApplicationStatus(item.status));
}

/** 是否应隐藏「申请加入」CTA */
export function blocksApplyAction(status?: ApplicationStatus | null): boolean {
  return status != null && ACTIVE_APPLICATION_STATUSES.includes(status);
}

export function buildApplicationStatusMap(
  applications: Array<{ postId: string; status: ApplicationStatus }>
): Map<string, ApplicationStatus> {
  const map = new Map<string, ApplicationStatus>();
  for (const app of applications) {
    const prev = map.get(app.postId);
    if (!prev) {
      map.set(app.postId, app.status);
      continue;
    }
    // pending / approved 优先于 rejected
    if (blocksApplyAction(app.status) || !blocksApplyAction(prev)) {
      map.set(app.postId, app.status);
    }
  }
  return map;
}

export function mergePostApplicationStatus<T extends { id: string; viewerApplicationStatus?: ApplicationStatus }>(
  post: T,
  applicationMap: Map<string, ApplicationStatus>
): T {
  const fromMap = applicationMap.get(post.id);
  if (!fromMap) return post;
  return {
    ...post,
    viewerApplicationStatus: post.viewerApplicationStatus ?? fromMap,
  };
}
