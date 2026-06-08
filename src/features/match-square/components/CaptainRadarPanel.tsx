import { useState } from 'react';
import { Radar, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CaptainRadarCandidate } from '@/types/match-square';
import { useCaptainRadar, useSendOliveBranch } from '../hooks/useMatchSquare';
import { plazaReview } from '../lib/plaza-visual';

interface CaptainRadarPanelProps {
  postId: string;
  className?: string;
}

/** 3.7.2 队长雷达 — 反向撮合 · 投递橄榄枝 */
export function CaptainRadarPanel({ postId, className }: CaptainRadarPanelProps) {
  const { data, isLoading } = useCaptainRadar(postId);
  const sendOlive = useSendOliveBranch();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const candidates = data?.picks ?? data?.candidates ?? [];
  if (isLoading) {
    return (
      <section className={cn(plazaReview.card, className)}>
        <p className="text-sm text-muted-foreground">扫描自由旅伴信号…</p>
      </section>
    );
  }

  if (candidates.length === 0) return null;

  const handleInvite = async (candidate: CaptainRadarCandidate) => {
    setSendingId(candidate.userId);
    try {
      await sendOlive.mutateAsync({
        postId,
        body: {
          inviteeUserId: candidate.userId,
          inviteMessage: `邀请你查看我的招募行程，考虑一起加入吗？`,
        },
      });
      toast.success(`已向 ${candidate.displayName} 投递橄榄枝`);
    } catch {
      toast.error('投递失败');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section className={cn(plazaReview.card, 'space-y-4', className)}>
      <div className="flex items-start gap-2">
        <Radar className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gate-suggest-foreground)]" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">系统雷达 · 自由旅伴</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data?.systemHint ??
              `发现 ${data?.total ?? candidates.length} 位挂起意向、契合度 ≥85% 的旅伴，可主动邀请入队`}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {candidates.map((c) => (
          <li
            key={c.userId}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {c.displayName}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {c.cardTitle} · {c.compatibilityPercent}%
                </span>
              </p>
              {c.departureLabel && (
                <p className="text-xs text-muted-foreground">出发地 · {c.departureLabel}</p>
              )}
              <p className="text-xs text-muted-foreground">{c.highlights.join(' · ')}</p>
            </div>
            <Button
              size="sm"
              variant={c.oliveBranchSent ? 'outline' : 'default'}
              disabled={c.oliveBranchSent || sendingId === c.userId}
              className="shrink-0 gap-1"
              onClick={() => handleInvite(c)}
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              {c.oliveBranchSent ? '已邀请' : '投递橄榄枝'}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
