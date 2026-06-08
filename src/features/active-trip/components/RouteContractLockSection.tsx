import { useState } from 'react';
import { Lock, Loader2, ShieldCheck, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ActiveTripDashboard } from '@/types/active-trip-dashboard';
import { routeContractLockApi } from '@/api/active-trip-subresources';
import { useQueryClient } from '@tanstack/react-query';
import { activeTripQueryKey, decisionReplayQueryKey } from '../hooks/useActiveTripDashboard';

type RouteContractLockSectionProps = {
  dashboard: ActiveTripDashboard;
  className?: string;
};

/** Route Contract Lock · Phase 3 Vault 授权 + 队长 reorder */
export function RouteContractLockSection({ dashboard, className }: RouteContractLockSectionProps) {
  const { routeContractLock: lock, viewer, trip } = dashboard;
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const [reorderNote, setReorderNote] = useState('');
  const [showReorder, setShowReorder] = useState(false);

  if (!lock?.milestones.length) return null;

  const pendingMilestones = lock.milestones.filter((m) => m.vaultStatus === 'pending_vault');
  const highlightAuthorize =
    viewer.awaitingViewerAction === 'authorize_vault_milestone' || lock.viewerCanAuthorize;

  const authorize = async (milestoneId?: string) => {
    setPending(true);
    try {
      const updated = await routeContractLockApi.authorize(trip.tripId, { milestoneId });
      qc.setQueryData(activeTripQueryKey(trip.tripId), updated);
      void qc.invalidateQueries({ queryKey: decisionReplayQueryKey(trip.tripId) });
      toast.success(milestoneId ? '里程碑已签署' : '全部待签项已授权');
    } catch {
      toast.error('Vault 授权失败');
    } finally {
      setPending(false);
    }
  };

  const reorder = async () => {
    setPending(true);
    try {
      const updated = await routeContractLockApi.reorder(trip.tripId, {
        milestoneIds: lock.milestones.map((m) => m.id),
        note: reorderNote.trim() || undefined,
      });
      qc.setQueryData(activeTripQueryKey(trip.tripId), updated);
      void qc.invalidateQueries({ queryKey: decisionReplayQueryKey(trip.tripId) });
      toast.success('里程碑顺序已提交');
      setShowReorder(false);
      setReorderNote('');
    } catch {
      toast.error('顺序调整失败');
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className={cn(
        'rounded-xl border px-4 py-3.5 text-sm',
        highlightAuthorize
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-muted/20',
        className
      )}
      aria-label="Route Contract Lock"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <h3 className="font-semibold text-foreground">Route Contract Lock</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lock.locked
                ? '全部里程碑 Vault 已锁'
                : `${pendingMilestones.length} 项待 Vault 授权`}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-normal">
          {lock.locked ? '已锁' : '待签'}
        </Badge>
      </div>

      <ul className="mt-3 space-y-1.5">
        {lock.milestones.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
          >
            <Lock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            <span className="text-foreground/90">{m.labelZh}</span>
            <Badge
              variant={m.vaultStatus === 'locked' ? 'secondary' : 'outline'}
              className="text-[10px] font-normal"
            >
              {m.vaultStatus === 'locked' ? 'Vault 已锁' : '待 Vault'}
            </Badge>
            {lock.viewerCanAuthorize && m.vaultStatus === 'pending_vault' && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-6 px-2 text-[10px]"
                disabled={pending}
                onClick={() => void authorize(m.id)}
              >
                签署此项
              </Button>
            )}
          </li>
        ))}
      </ul>

      {lock.viewerCanAuthorize && pendingMilestones.length > 0 && (
        <Button
          className="mt-3 w-full sm:w-auto"
          size="sm"
          disabled={pending}
          onClick={() => void authorize()}
        >
          {pending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <PenLine className="mr-1.5 h-3.5 w-3.5" />
          )}
          一次签署全部待签里程碑
        </Button>
      )}

      {viewer.role === 'captain' &&
        lock.canCaptainRollbackMilestoneOrder &&
        !lock.locked && (
          <div className="mt-3 border-t border-border/60 pt-3">
            {!showReorder ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setShowReorder(true)}
              >
                调整里程碑顺序（锁定前）
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  当前顺序：{lock.milestones.map((m) => m.labelZh).join(' → ')}
                </p>
                <Textarea
                  value={reorderNote}
                  onChange={(e) => setReorderNote(e.target.value)}
                  placeholder="例：先过涉水再进 hut…"
                  rows={2}
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={pending} onClick={() => void reorder()}>
                    提交顺序
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowReorder(false);
                      setReorderNote('');
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      {lock.canCaptainRollbackMilestoneOrder && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          全托管队长可在极端情况下发起路线 rollback（需全队确认）。
        </p>
      )}
    </section>
  );
}
