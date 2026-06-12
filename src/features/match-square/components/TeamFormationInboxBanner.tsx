import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMyRecruitmentHub } from '../hooks/useMatchSquare';
import {
  dismissTeamFormation,
  listUndismissedTeamFormations,
} from '../lib/team-formation-notifications';
import { plazaBanner } from '../lib/plaza-visual';

/** 组队成功收件箱 — 队长结束招募后通知已通过队员 */
export function TeamFormationInboxBanner() {
  const navigate = useNavigate();
  const { data: hub } = useMyRecruitmentHub(true);
  const [dismissedVersion, setDismissedVersion] = useState(0);

  const pendingNotices = useMemo(() => {
    void dismissedVersion;
    return listUndismissedTeamFormations(hub?.applied ?? []);
  }, [hub?.applied, dismissedVersion]);

  if (!pendingNotices.length) return null;

  const handleDismiss = (postId: string) => {
    dismissTeamFormation(postId);
    setDismissedVersion((v) => v + 1);
  };

  const handleView = (postId: string, tripId?: string | null) => {
    dismissTeamFormation(postId);
    setDismissedVersion((v) => v + 1);
    navigate(tripId ? `/dashboard/trips/${tripId}` : `/dashboard/tripnara/plaza/${postId}`);
  };

  return (
    <div className="space-y-3">
      {pendingNotices.map((notice) => (
        <div
          key={notice.postId}
          className={cn(
            plazaBanner.base,
            notice.teamFull ? plazaBanner.confirm : plazaBanner.muted,
            'flex-col items-stretch sm:flex-row sm:items-start'
          )}
        >
          <div className="flex min-w-0 flex-1 gap-2">
            {notice.teamFull ? (
              <PartyPopper className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Flag className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">
                {notice.teamFull
                  ? `「${notice.destination}」组队成功！`
                  : `「${notice.destination}」招募已结束`}
              </p>
              <p className="text-xs opacity-90">
                {notice.teamFull
                  ? '车队已满员，可查看招募详情或后续行程安排。'
                  : notice.slotsRemaining > 0
                    ? `队长提前结束招募，车队尚缺 ${notice.slotsRemaining} 人。`
                    : '队长已结束招募，不再接收新申请。'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-[var(--gate-confirm-border)]"
              onClick={() => handleDismiss(notice.postId)}
            >
              知道了
            </Button>
            <Button size="sm" onClick={() => handleView(notice.postId, notice.tripId)}>
              {notice.tripId ? '查看行程' : '查看详情'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
