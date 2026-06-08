import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useOliveBranchInvitations,
  useRespondOliveBranchInvitation,
} from '../hooks/useMatchSquare';
import { plazaBanner } from '../lib/plaza-visual';

/** 队员橄榄枝收件箱 — GET /my/olive-branch-invitations */
export function OliveBranchInboxBanner() {
  const navigate = useNavigate();
  const { data: invitations } = useOliveBranchInvitations();
  const respond = useRespondOliveBranchInvitation();

  const pending = (invitations ?? []).filter((i) => i.status === 'pending');
  if (!pending.length) return null;

  const handleRespond = async (id: string, action: 'accept' | 'decline') => {
    try {
      const result = await respond.mutateAsync({ invitationId: id, action });
      if (action === 'accept') {
        toast.success('已接受邀请，正在打开招募详情');
        navigate(`/dashboard/tripnara/plaza/${result.postId}`);
      } else {
        toast.success('已婉拒邀请');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  return (
    <div className="space-y-3">
      {pending.map((inv) => (
        <div
          key={inv.id}
          className={cn(plazaBanner.base, plazaBanner.suggest, 'flex-col items-stretch sm:flex-row sm:items-start')}
        >
          <div className="flex min-w-0 flex-1 gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">
                「{inv.postDestination}」的队长 {inv.captainDisplayName} 向你投递了橄榄枝
              </p>
              <p className="text-xs opacity-90">
                {inv.message ??
                  `${inv.captainCardTitle} 被你的旅行人格吸引，邀请你查看详细行程并考虑加入`}
                {inv.compatibilityPercent != null && ` · 契合度 ${inv.compatibilityPercent}%`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-[var(--gate-suggest-border)]"
              disabled={respond.isPending}
              onClick={() => handleRespond(inv.id, 'decline')}
            >
              婉拒
            </Button>
            <Button size="sm" disabled={respond.isPending} onClick={() => handleRespond(inv.id, 'accept')}>
              查看行程
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
