import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { RecruitmentPostCard } from '@/types/match-square';
import { canShowForceLockEntry } from '../lib/sovereign-force-lock/resolve-force-lock-visibility';
import { normalizeActiveTripPath } from '@/features/active-trip/lib/normalize-active-trip-path';
import { useCommitForceLock, useForceLockPreview } from '../hooks/useMatchSquare';

type SovereignForceLockSheetProps = {
  post: RecruitmentPostCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

/** PRD 3.15 · 队长强制成团确认 Bottom Sheet */
export function SovereignForceLockSheet({
  post,
  open,
  onOpenChange,
  onSuccess,
}: SovereignForceLockSheetProps) {
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const { data: preview, isLoading, isError, refetch } = useForceLockPreview(
    post.id,
    open,
    post
  );
  const commit = useCommitForceLock();

  useEffect(() => {
    if (!open) setNote('');
  }, [open]);

  const handleConfirm = async () => {
    try {
      const result = await commit.mutateAsync({
        postId: post.id,
        body: note.trim() ? { note: note.trim() } : {},
      });
      toast.success('阵容已锁死，招募已关闭');
      onOpenChange(false);
      onSuccess?.();

      const path =
        normalizeActiveTripPath(
          result.activeTripPath,
          result.instantiation?.tripId ?? undefined
        ) ?? null;
      if (path) {
        navigate(path);
      }
    } catch {
      toast.error('锁死阵容失败，请稍后重试');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden />
            锁死阵容
          </SheetTitle>
          <SheetDescription>
            在不凑满原编制的前提下关闭招募，裁剪开放拼图位并拒绝待审批申请。
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载缩编预览…
          </div>
        ) : isError || !preview ? (
          <div className="space-y-3 py-6 text-sm">
            <p className="text-destructive">预览加载失败</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              重试
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {!preview.canForceLock && preview.blockReason && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {preview.blockReason}
              </div>
            )}

            {preview.confirmHeadline && (
              <p className="text-sm font-medium text-foreground">{preview.confirmHeadline}</p>
            )}

            {preview.confirmLines.length > 0 && (
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {preview.confirmLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-foreground/40">·</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}

            {preview.vaultRecalc.summaryLine && (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                {preview.vaultRecalc.summaryLine}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] font-normal">
                韧性 {preview.resilienceScore}
              </Badge>
              {preview.pendingApplicationsToReject > 0 && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  将拒绝 {preview.pendingApplicationsToReject} 条待审批
                </Badge>
              )}
            </div>

            {preview.currentCrew.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground">当前阵容</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {preview.currentCrew.map((member) => (
                    <li key={member.userId}>
                      · {member.displayName || member.slotLabel}
                      {member.role ? ` · ${member.role}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.droppedOpenSlots.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground">将被裁剪的开放位</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {preview.droppedOpenSlots.map((slot) => (
                    <li key={slot.slotId}>
                      · {slot.roleLabel}
                      {slot.deficitTag ? `（${slot.deficitTag}）` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.physicalDeficits.length > 0 && (
              <div className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                <p className="mb-1 flex items-center gap-1 font-medium text-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  物理赤字提示
                </p>
                <ul className="space-y-0.5">
                  {preview.physicalDeficits.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="force-lock-note" className="text-xs">
                备注（可选）
              </Label>
              <Textarea
                id="force-lock-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="例如：核心队员已到，不再等待拼图位"
                className="min-h-[72px] text-sm"
                maxLength={280}
              />
            </div>
          </div>
        )}

        <SheetFooter className="mt-4 flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={commit.isPending}>
            取消
          </Button>
          <Button
            disabled={!preview?.canForceLock || commit.isPending || isLoading}
            onClick={() => void handleConfirm()}
          >
            {commit.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                锁死中…
              </>
            ) : (
              '确认锁死阵容'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type SovereignForceLockEntryProps = {
  post: RecruitmentPostCard;
  className?: string;
  buttonClassName?: string;
  variant?: 'default' | 'outline';
};

/** 队长入口 + 已锁团摘要 */
export function SovereignForceLockEntry({
  post,
  className,
  buttonClassName,
  variant = 'outline',
}: SovereignForceLockEntryProps) {
  const [open, setOpen] = useState(false);

  if (post.sovereignLock) {
    const lock = post.sovereignLock;
    return (
      <div
        className={cn(
          'rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm',
          className
        )}
      >
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          已执行队长强制成团
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          编制 {lock.originalSlotsNeeded} → {lock.effectiveSlotsNeeded + 1} 人（含队长）
          {lock.vaultRecalc.summaryLine ? ` · ${lock.vaultRecalc.summaryLine}` : ''}
        </p>
        {lock.taskRebalanceNote && (
          <p className="mt-1 text-xs text-muted-foreground">{lock.taskRebalanceNote}</p>
        )}
      </div>
    );
  }

  if (!canShowForceLockEntry(post)) return null;

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Button
          size="sm"
          variant={variant}
          className={cn('h-8 text-xs', buttonClassName)}
          onClick={() => setOpen(true)}
        >
          🔒 锁死阵容
        </Button>
        <p className="text-xs text-muted-foreground">
          核心队员已到 · 可缩编开放拼图位并关闭招募
        </p>
      </div>
      <SovereignForceLockSheet post={post} open={open} onOpenChange={setOpen} />
    </>
  );
}
