import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMyApplications, useMyRecruitmentHub } from '../hooks/useMatchSquare';
import {
  dismissApplicationDecision,
  listUndismissedApplicationDecisions,
} from '../lib/application-decision-notifications';
import { plazaBanner } from '../lib/plaza-visual';

/** 入队申请审批结果收件箱 — 待查看的通过/拒绝通知 */
export function ApplicationDecisionInboxBanner() {
  const navigate = useNavigate();
  const { data: applications } = useMyApplications(true);
  const { data: hub } = useMyRecruitmentHub(true);
  const [dismissedVersion, setDismissedVersion] = useState(0);

  const destinationByPostId = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of hub?.applied ?? []) {
      if (entry.post.destination) {
        map.set(entry.post.id, entry.post.destination);
      }
    }
    return map;
  }, [hub?.applied]);

  const pendingNotices = useMemo(() => {
    void dismissedVersion;
    return listUndismissedApplicationDecisions(applications ?? []);
  }, [applications, dismissedVersion]);

  if (!pendingNotices.length) return null;

  const handleDismiss = (applicationId: string) => {
    dismissApplicationDecision(applicationId);
    setDismissedVersion((v) => v + 1);
  };

  const handleView = (postId: string, applicationId: string) => {
    dismissApplicationDecision(applicationId);
    setDismissedVersion((v) => v + 1);
    navigate(`/dashboard/tripnara/plaza/${postId}`);
  };

  return (
    <div className="space-y-3">
      {pendingNotices.map((app) => {
        const approved = app.status === 'approved';
        const destination = destinationByPostId.get(app.postId);
        const destinationLabel = destination ? `「${destination}」` : '该招募';
        return (
          <div
            key={app.id}
            className={cn(
              plazaBanner.base,
              approved
                ? 'border-[var(--gate-allow-border)] bg-[var(--gate-allow)] text-[var(--gate-allow-foreground)]'
                : plazaBanner.reject,
              'flex-col items-stretch sm:flex-row sm:items-start'
            )}
          >
            <div className="flex min-w-0 flex-1 gap-2">
              {approved ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-foreground">
                  {approved
                    ? `队长已通过你的 ${destinationLabel} 入队申请`
                    : `你的 ${destinationLabel} 入队申请未通过`}
                </p>
                <p className="text-xs opacity-90">
                  {approved
                    ? '恭喜入队！可查看招募详情，了解车队拼图与后续行程安排。'
                    : '队长暂未通过本次申请，可查看详情或浏览其他招募。'}
                  {app.compatibilityPercent > 0 && ` · 匹配度 ${app.compatibilityPercent}%`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                className={approved ? 'border-[var(--gate-allow-border)]' : 'border-[var(--gate-reject-border)]'}
                onClick={() => handleDismiss(app.id)}
              >
                知道了
              </Button>
              <Button size="sm" onClick={() => handleView(app.postId, app.id)}>
                查看详情
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
