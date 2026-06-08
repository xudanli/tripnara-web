import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RecruitmentDetailPanel } from './RecruitmentDetailPanel';

interface RecruitmentDetailDialogProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 广场 · 招募详情弹窗（保留 /plaza/:id 独立页供分享与深链） */
export function RecruitmentDetailDialog({
  postId,
  open,
  onOpenChange,
}: RecruitmentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,840px)] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 space-y-0.5 border-b border-border px-4 py-2.5 pr-12 text-left">
          <DialogTitle className="text-base font-semibold leading-snug">招募详情</DialogTitle>
          <DialogDescription className="sr-only">
            查看招募帖完整信息、契合度与申请入口
          </DialogDescription>
          {postId && (
            <Button
              variant="link"
              asChild
              className="h-auto justify-start p-0 text-xs text-muted-foreground"
            >
              <Link
                to={`/dashboard/tripnara/plaza/${postId}`}
                onClick={() => onOpenChange(false)}
              >
                <ExternalLink className="mr-1 h-3 w-3" aria-hidden />
                在新页面打开
              </Link>
            </Button>
          )}
        </DialogHeader>

        {postId && open ? (
          <RecruitmentDetailPanel postId={postId} variant="dialog" />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
