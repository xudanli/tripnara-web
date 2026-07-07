import { Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSilentVoteList } from '@/hooks/useSilentVotes';
import { SilentVoteListPanel } from './SilentVoteListPanel';

interface SilentVoteHubDialogProps {
  tripId: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  /** 深链或决策空间传入：打开后自动展开该投票 */
  initialVoteId?: string | null;
}

/** 规划工作台右上角：按需打开团队投票（非常驻团队 Tab 区块） */
export function SilentVoteHubDialog({
  tripId,
  className,
  open,
  onOpenChange,
  showTrigger = true,
  initialVoteId,
}: SilentVoteHubDialogProps) {
  const { items } = useSilentVoteList(tripId);
  const openVotes = items.filter((v) => v.status === 'open');
  const pendingMine = openVotes.filter((v) => !v.myBallotSubmitted).length;

  const trigger = showTrigger ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('relative gap-1.5 text-xs sm:text-sm', className)}
    >
      <Vote className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="hidden sm:inline">团队投票</span>
      <span className="sm:hidden">投票</span>
      {pendingMine > 0 ? (
        <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
          {pendingMine}
        </Badge>
      ) : openVotes.length > 0 ? (
        <Badge variant="outline" className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
          {openVotes.length}
        </Badge>
      ) : null}
    </Button>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[min(92vh,880px)] w-[min(96vw,720px)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">Silent Vote · 团队投票</DialogTitle>
          <DialogDescription>
            匿名表达倾向与在意程度；通常在方案对比后发起，也可在此手动创建
          </DialogDescription>
        </DialogHeader>
        <SilentVoteListPanel
          tripId={tripId}
          showCreate
          initialVoteId={open ? initialVoteId : null}
          className="border-0 shadow-none rounded-none"
        />
      </DialogContent>
    </Dialog>
  );
}
