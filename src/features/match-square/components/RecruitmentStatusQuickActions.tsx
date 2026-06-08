import { useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { RecruitmentPostStatus } from '@/types/match-square';
import { useUpdatePostStatus } from '../hooks/useMatchSquare';

type StatusAction = 'hidden' | 'closed' | 'active';

const CONFIRM_COPY: Record<
  Extract<StatusAction, 'hidden' | 'closed'>,
  {
    title: string;
    description: string;
    confirm: string;
    destructive: boolean;
    success: string;
  }
> = {
  hidden: {
    title: '下架并隐藏这条招募？',
    description:
      '帖子将立刻从搭子广场对他人不可见，新的申请也会暂停。你之后仍可在「我的招募」里重新上架。',
    confirm: '确认下架',
    destructive: false,
    success: '已下架隐藏',
  },
  closed: {
    title: '结束这条招募？',
    description:
      '将不再接收新的入队申请；已通过队员不受影响。若车队尚未满员，请确认是否仍要结束招募。',
    confirm: '确认结束招募',
    destructive: true,
    success: '招募已结束',
  },
};

interface RecruitmentStatusQuickActionsProps {
  postId: string;
  status: RecruitmentPostStatus;
  size?: 'sm' | 'default';
  className?: string;
}

/** 队长 · 招募状态快捷操作（下架 / 结束须二次确认） */
export function RecruitmentStatusQuickActions({
  postId,
  status,
  size = 'sm',
  className,
}: RecruitmentStatusQuickActionsProps) {
  const updateStatus = useUpdatePostStatus();
  const [pending, setPending] = useState<Extract<StatusAction, 'hidden' | 'closed'> | null>(
    null
  );

  const confirmCopy = pending ? CONFIRM_COPY[pending] : null;

  const runConfirmed = async () => {
    if (!pending) return;
    try {
      await updateStatus.mutateAsync({ id: postId, status: pending });
      toast.success(CONFIRM_COPY[pending].success);
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setPending(null);
    }
  };

  const relist = async () => {
    try {
      await updateStatus.mutateAsync({ id: postId, status: 'active' });
      toast.success('已重新上架');
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  if (status !== 'active' && status !== 'hidden') return null;

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {status === 'active' && (
          <>
            <Button
              size={size}
              variant="outline"
              disabled={updateStatus.isPending}
              onClick={() => setPending('hidden')}
            >
              下架隐藏
            </Button>
            <Button
              size={size}
              variant="outline"
              disabled={updateStatus.isPending}
              onClick={() => setPending('closed')}
            >
              结束招募
            </Button>
          </>
        )}
        {status === 'hidden' && (
          <Button size={size} variant="outline" disabled={updateStatus.isPending} onClick={relist}>
            重新上架
          </Button>
        )}
      </div>

      <AlertDialog open={pending != null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateStatus.isPending}
              className={cn(confirmCopy?.destructive && buttonVariants({ variant: 'destructive' }))}
              onClick={(event) => {
                event.preventDefault();
                void runConfirmed();
              }}
            >
              {confirmCopy?.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
