import { Heart } from 'lucide-react';
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
import { PrivateWishlistPanel } from './PrivateWishlistPanel';
import { useTripWishSummary } from '@/hooks/useTripWishes';
import { cn } from '@/lib/utils';

interface PrivateWishDialogProps {
  tripId: string;
  destinationLabel?: string;
  userDisplayName?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function PrivateWishDialog({
  tripId,
  destinationLabel,
  userDisplayName,
  className,
  open,
  onOpenChange,
  showTrigger = true,
}: PrivateWishDialogProps) {
  const { summary, reload } = useTripWishSummary(tripId);
  const privateCount = summary?.privateCount ?? 0;
  const mineCount = summary?.mineCount ?? 0;

  const trigger = showTrigger ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('relative gap-1.5 text-xs sm:text-sm', className)}
    >
      <Heart className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="hidden sm:inline">私密想法</span>
      <span className="sm:hidden">心愿</span>
      {privateCount > 0 ? (
        <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
          {privateCount}
        </Badge>
      ) : null}
    </Button>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[min(92vh,880px)] w-[min(96vw,960px)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold tracking-tight">
                我的心愿单
              </DialogTitle>
              <DialogDescription>
                记录个人偏好，规划时 AI 会参考；默认仅自己可见
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {destinationLabel ? (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {destinationLabel}
                </Badge>
              ) : null}
              <Badge variant="secondary" className="font-normal">
                {mineCount} 条心愿
              </Badge>
              {privateCount > 0 ? (
                <Badge variant="secondary" className="font-normal">
                  {privateCount} 条私密
                </Badge>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <PrivateWishlistPanel
            tripId={tripId}
            destinationLabel={destinationLabel}
            userDisplayName={userDisplayName}
            embedded
            onSummaryChange={() => void reload()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated 使用 PrivateWishDialog */
export const PrivateWishDrawer = PrivateWishDialog;
