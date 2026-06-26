import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitReputationDispute } from '@/hooks/useReputationDisputes';

interface ReputationDisputeDialogProps {
  eventId: string;
  eventSummary?: string | null;
}

/** R2 · 对声誉事实发起争议（非 Project Fit 申诉） */
export function ReputationDisputeDialog({ eventId, eventSummary }: ReputationDisputeDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const submit = useSubmitReputationDispute();

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      toast.error('争议理由至少 10 字');
      return;
    }
    try {
      await submit.mutateAsync({ eventId, reason: reason.trim() });
      toast.success('争议已提交');
      setOpen(false);
      setReason('');
    } catch {
      toast.error('提交失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          争议
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>发起声誉争议</DialogTitle>
        </DialogHeader>
        {eventSummary && <p className="text-sm text-muted-foreground">{eventSummary}</p>}
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="说明与事实不符之处（至少 10 字）"
          rows={4}
        />
        <DialogFooter>
          <Button onClick={() => void handleSubmit()} disabled={submit.isPending}>
            {submit.isPending ? '提交中…' : '提交争议'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
