import { Handshake } from 'lucide-react';
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
import { useDomainNegotiationTasks } from '@/hooks/useDomainNegotiationTasks';
import { StructuredNegotiationPanel } from './StructuredNegotiationPanel';

interface StructuredNegotiationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRoundId?: string | null;
  initialRoundDomain?: string | null;
  /** 规划工作台右上角入口 */
  showTrigger?: boolean;
  className?: string;
}

/** Agent / 深链 / 右上角触发：结构化协商弹窗（非团队 Tab 常驻块） */
export function StructuredNegotiationDialog({
  tripId,
  open,
  onOpenChange,
  initialRoundId,
  initialRoundDomain,
  showTrigger = false,
  className,
}: StructuredNegotiationDialogProps) {
  const { data: tasks = [] } = useDomainNegotiationTasks(tripId);
  const activeTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_discussion',
  );
  const inDiscussion = activeTasks.filter((t) => t.status === 'in_discussion').length;

  const trigger = showTrigger ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('relative gap-1.5 text-xs sm:text-sm', className)}
    >
      <Handshake className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="hidden sm:inline">结构化协商</span>
      <span className="sm:hidden">协商</span>
      {inDiscussion > 0 ? (
        <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
          {inDiscussion}
        </Badge>
      ) : activeTasks.length > 0 ? (
        <Badge variant="outline" className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
          {activeTasks.length}
        </Badge>
      ) : null}
    </Button>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[min(92vh,900px)] w-[min(96vw,960px)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">结构化协商</DialogTitle>
          <DialogDescription>
            Round Robin 偏好分享 · 中/高交叉领域；由 Agent 或领域认领后触发
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <StructuredNegotiationPanel
              tripId={tripId}
              allowUrlSync
              initialRoundId={initialRoundId}
              initialRoundDomain={initialRoundDomain}
              className="border-0 shadow-none rounded-none"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
