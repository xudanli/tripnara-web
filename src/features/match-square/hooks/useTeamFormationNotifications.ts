import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { MY_RECRUITMENT_HUB_QUERY_KEY } from './useMatchSquare';
import { loadMyRecruitmentHub } from '../lib/my-recruitments';
import {
  buildTeamFormationPostStatusSnapshot,
  detectTeamFormationChanges,
  ensureTeamFormationNotificationsInitialized,
  loadTeamFormationPostStatusSnapshot,
  saveTeamFormationPostStatusSnapshot,
  type TeamFormationNotice,
} from '../lib/team-formation-notifications';

const TOAST_SESSION_KEY = 'match-square:team-formation-toast-session';

function toastAlreadyShown(postId: string): boolean {
  try {
    const raw = sessionStorage.getItem(TOAST_SESSION_KEY);
    const shown = raw ? (JSON.parse(raw) as string[]) : [];
    return shown.includes(postId);
  } catch {
    return false;
  }
}

function markToastShown(postId: string): void {
  try {
    const raw = sessionStorage.getItem(TOAST_SESSION_KEY);
    const shown = raw ? (JSON.parse(raw) as string[]) : [];
    if (!shown.includes(postId)) {
      shown.push(postId);
      sessionStorage.setItem(TOAST_SESSION_KEY, JSON.stringify(shown));
    }
  } catch {
    sessionStorage.setItem(TOAST_SESSION_KEY, JSON.stringify([postId]));
  }
}

function resolveNoticePath(notice: TeamFormationNotice): string {
  if (notice.tripId) {
    return `/dashboard/trips/${notice.tripId}`;
  }
  return `/dashboard/tripnara/plaza/${notice.postId}`;
}

function notifyTeamFormation(
  notice: TeamFormationNotice,
  navigate: (path: string) => void
): void {
  if (toastAlreadyShown(notice.postId)) return;

  const path = resolveNoticePath(notice);
  const actionLabel = notice.tripId ? '查看行程' : '查看详情';

  if (notice.teamFull) {
    toast.success(`「${notice.destination}」组队成功！车队已满员`, {
      duration: 8000,
      description: '队长已结束招募，可查看后续行程安排。',
      action: {
        label: actionLabel,
        onClick: () => navigate(path),
      },
    });
    return;
  }

  toast.info(`「${notice.destination}」招募已结束`, {
    duration: 8000,
    description:
      notice.slotsRemaining > 0
        ? `队长提前结束招募，车队尚缺 ${notice.slotsRemaining} 人。`
        : '队长已结束招募，不再接收新申请。',
    action: {
      label: actionLabel,
      onClick: () => navigate(path),
    },
  });

  markToastShown(notice.postId);
}

/**
 * 全局轮询我的入队申请 — 招募帖 active → closed 时通知已通过队员
 */
export function useTeamFormationNotifications(enabled = true) {
  const navigate = useNavigate();
  const processingRef = useRef(false);

  const { data: hub } = useQuery({
    queryKey: MY_RECRUITMENT_HUB_QUERY_KEY,
    queryFn: () => loadMyRecruitmentHub(),
    enabled,
    staleTime: 10_000,
    refetchInterval: enabled ? 20_000 : false,
    refetchIntervalInBackground: true,
  });

  const applied = hub?.applied ?? [];

  useEffect(() => {
    if (!enabled || !applied.length) return;
    if (processingRef.current) return;

    processingRef.current = true;

    try {
      if (ensureTeamFormationNotificationsInitialized(applied)) {
        return;
      }

      const previousSnapshot = loadTeamFormationPostStatusSnapshot();
      const changes = detectTeamFormationChanges(applied, previousSnapshot);

      for (const notice of changes) {
        notifyTeamFormation(notice, navigate);
      }

      saveTeamFormationPostStatusSnapshot(buildTeamFormationPostStatusSnapshot(applied));
    } finally {
      processingRef.current = false;
    }
  }, [applied, enabled, navigate]);
}
