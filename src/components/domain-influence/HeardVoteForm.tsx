import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { PreferenceRoundDetail } from '@/types/process-fairness';

interface HeardVoteFormProps {
  detail: PreferenceRoundDetail;
  currentUserId?: string | null;
  submitting?: boolean;
  onSubmit: (votes: Array<{ targetUserId: string; heard: boolean }>) => void;
  className?: string;
}

export function HeardVoteForm({
  detail,
  currentUserId,
  submitting,
  onSubmit,
  className,
}: HeardVoteFormProps) {
  const targets = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ userId: string; displayName: string }> = [];
    for (const u of detail.utterances) {
      if (!u.userId || seen.has(u.userId)) continue;
      if (currentUserId && u.userId === currentUserId) continue;
      seen.add(u.userId);
      list.push({ userId: u.userId, displayName: u.displayName });
    }
    for (const uid of detail.turnOrder) {
      if (!uid || seen.has(uid) || uid === currentUserId) continue;
      seen.add(uid);
      const utterance = detail.utterances.find((u) => u.userId === uid);
      list.push({ userId: uid, displayName: utterance?.displayName ?? '成员' });
    }
    return list;
  }, [detail.utterances, detail.turnOrder, currentUserId]);

  const [votes, setVotes] = useState<Record<string, boolean>>({});

  const allAnswered = targets.every((t) => votes[t.userId] !== undefined);

  if (detail.myHeardVotesSubmitted) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        你已提交「被听见」反馈，等待其他成员完成。
      </p>
    );
  }

  if (targets.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>暂无可投票的成员。</p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm text-muted-foreground">
        本轮讨论中，你觉得每位成员的观点被团队听见了吗？
      </p>

      <div className="space-y-3">
        {targets.map((target) => (
          <div key={target.userId} className="rounded-lg border border-border/80 px-3 py-2.5">
            <Label className="text-sm font-medium">{target.displayName}</Label>
            <RadioGroup
              value={votes[target.userId] === undefined ? '' : votes[target.userId] ? 'yes' : 'no'}
              onValueChange={(v) =>
                setVotes((prev) => ({ ...prev, [target.userId]: v === 'yes' }))
              }
              className="mt-2 flex gap-4"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="yes" id={`heard-${target.userId}-yes`} />
                听见了
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="no" id={`heard-${target.userId}-no`} />
                还需要再听
              </label>
            </RadioGroup>
          </div>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        disabled={!allAnswered || submitting || !detail.canSubmitHeardVotes}
        onClick={() =>
          onSubmit(
            targets.map((t) => ({
              targetUserId: t.userId,
              heard: votes[t.userId] ?? false,
            })),
          )
        }
      >
        {submitting ? '提交中…' : '提交反馈'}
      </Button>
    </div>
  );
}
