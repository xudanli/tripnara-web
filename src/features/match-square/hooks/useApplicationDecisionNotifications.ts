import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { matchSquareApi } from '@/api/match-square';
import type { RecruitmentApplicationCard } from '@/types/match-square';
import { enrichApplicationsWithApplicantIdentity } from '../lib/enrich-applications-applicant-identity';
import {
  buildApplicationStatusSnapshot,
  detectApplicationDecisionChanges,
  dismissApplicationDecision,
  ensureApplicationNotificationsInitialized,
  loadApplicationStatusSnapshot,
  saveApplicationStatusSnapshot,
} from '../lib/application-decision-notifications';

const TOAST_SESSION_KEY = 'match-square:application-decision-toast-session';

function toastAlreadyShown(applicationId: string): boolean {
  try {
    const raw = sessionStorage.getItem(TOAST_SESSION_KEY);
    const shown = raw ? (JSON.parse(raw) as string[]) : [];
    return shown.includes(applicationId);
  } catch {
    return false;
  }
}

function markToastShown(applicationId: string): void {
  try {
    const raw = sessionStorage.getItem(TOAST_SESSION_KEY);
    const shown = raw ? (JSON.parse(raw) as string[]) : [];
    if (!shown.includes(applicationId)) {
      shown.push(applicationId);
      sessionStorage.setItem(TOAST_SESSION_KEY, JSON.stringify(shown));
    }
  } catch {
    sessionStorage.setItem(TOAST_SESSION_KEY, JSON.stringify([applicationId]));
  }
}

async function resolvePostDestination(postId: string): Promise<string> {
  try {
    const post = await matchSquareApi.getPost(postId);
    return post.destination?.trim() || '该招募';
  } catch {
    return '该招募';
  }
}

async function notifyApplicationDecision(
  application: RecruitmentApplicationCard,
  navigate: (path: string) => void
): Promise<void> {
  if (toastAlreadyShown(application.id)) return;

  const destination = await resolvePostDestination(application.postId);
  const detailPath = `/dashboard/tripnara/plaza/${application.postId}`;

  if (application.status === 'approved') {
    toast.success(`恭喜！队长已通过你的「${destination}」入队申请`, {
      duration: 8000,
      action: {
        label: '查看详情',
        onClick: () => navigate(detailPath),
      },
    });
  } else {
    toast.info(`你的「${destination}」入队申请未通过`, {
      duration: 8000,
      action: {
        label: '查看详情',
        onClick: () => navigate(detailPath),
      },
    });
  }

  markToastShown(application.id);
}

/**
 * 全局轮询我的申请 — pending → approved/rejected 时弹出 Toast
 * 挂载于 DashboardLayout，覆盖用户不在广场页的场景
 */
export function useApplicationDecisionNotifications(enabled = true) {
  const navigate = useNavigate();
  const processingRef = useRef(false);

  const { data: applications } = useQuery({
    queryKey: ['match-square', 'my-applications'],
    queryFn: async () => {
      const apps = await matchSquareApi.listMyApplications();
      return enrichApplicationsWithApplicantIdentity(apps);
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: enabled ? 20_000 : false,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!enabled || !applications?.length) return;
    if (processingRef.current) return;

    processingRef.current = true;

    void (async () => {
      try {
        if (ensureApplicationNotificationsInitialized(applications)) {
          return;
        }

        const previousSnapshot = loadApplicationStatusSnapshot();
        const changes = detectApplicationDecisionChanges(applications, previousSnapshot);

        for (const app of changes) {
          await notifyApplicationDecision(app, navigate);
        }

        saveApplicationStatusSnapshot(buildApplicationStatusSnapshot(applications));
      } finally {
        processingRef.current = false;
      }
    })();
  }, [applications, enabled, navigate]);
}

export { dismissApplicationDecision };
