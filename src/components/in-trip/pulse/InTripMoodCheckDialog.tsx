import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { inTripPulseApi } from '@/api/in-trip-pulse';
import { MOOD_CHECK_LABELS } from '@/lib/in-trip-pulse';

interface InTripMoodCheckDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const MOOD_EMOJI: Record<number, string> = {
  1: '😴',
  2: '😮‍💨',
  3: '😐',
  4: '🙂',
  5: '⚡',
};

export function InTripMoodCheckDialog({
  tripId,
  open,
  onOpenChange,
  onSubmitted,
}: InTripMoodCheckDialogProps) {
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score == null) return;
    try {
      setSubmitting(true);
      await inTripPulseApi.moodCheck(tripId, { score, source: 'mood_check' });
      toast.success('今日签到已记录');
      onSubmitted?.();
      onOpenChange(false);
      setScore(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '签到失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>今日感觉怎么样？</DialogTitle>
          <DialogDescription>3 秒签到，帮助团队更好安排节奏</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-2 py-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 transition-colors',
                score === n
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                  : 'hover:bg-muted/50',
              )}
            >
              <span className="text-2xl" aria-hidden>
                {MOOD_EMOJI[n]}
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {MOOD_CHECK_LABELS[n]}
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            跳过
          </Button>
          <Button type="button" disabled={score == null || submitting} onClick={handleSubmit}>
            {submitting ? '提交中…' : '完成签到'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
