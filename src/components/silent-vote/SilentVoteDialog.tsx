import { Vote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SilentVoteDetailPanel } from './SilentVoteDetailPanel';

interface SilentVoteDialogProps {
  tripId: string;
  voteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
  title?: string;
}

export function SilentVoteDialog({
  tripId,
  voteId,
  open,
  onOpenChange,
  canManage,
  title = 'Silent Vote · 匿名投票',
}: SilentVoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,840px)] w-[min(96vw,880px)] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-4 w-4 text-muted-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription>匿名选择倾向方案，并表达你对最终决策的在意程度</DialogDescription>
        </DialogHeader>
        {voteId ? (
          <SilentVoteDetailPanel
            tripId={tripId}
            voteId={voteId}
            canManage={canManage}
            onClosed={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
