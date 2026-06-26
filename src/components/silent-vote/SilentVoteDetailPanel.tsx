import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { SILENT_VOTE_STATUS_LABEL } from '@/lib/silent-vote-labels';
import {
  useSilentVoteBallotPrefill,
  useSilentVoteDetail,
} from '@/hooks/useSilentVotes';
import { useSilentVotePermissions } from '@/hooks/useSilentVotePermissions';
import { SilentVoteAggregateView } from './SilentVoteAggregateView';
import { SilentVoteBallotForm } from './SilentVoteBallotForm';

interface SilentVoteDetailPanelProps {
  tripId: string;
  voteId: string;
  canManage?: boolean;
  className?: string;
  onClosed?: () => void;
}

export function SilentVoteDetailPanel({
  tripId,
  voteId,
  canManage = false,
  className,
  onClosed,
}: SilentVoteDetailPanelProps) {
  const { detail, loading, submitting, reload, submitBallot, openVote, closeVote } =
    useSilentVoteDetail(tripId, voteId);
  const { canManage: checkCanManage } = useSilentVotePermissions(tripId);
  const { optionId, setOptionId, intensity, setIntensity } = useSilentVoteBallotPrefill(
    tripId,
    voteId,
    detail,
  );

  const effectiveCanManage = canManage ?? checkCanManage(detail);

  if (loading && !detail) {
    return (
      <div className={cn('flex justify-center py-10', className)}>
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!detail) {
    return (
      <p className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        无法加载投票详情
      </p>
    );
  }

  const statusVariant =
    detail.status === 'open' ? 'default' : detail.status === 'closed' ? 'secondary' : 'outline';

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{detail.title}</h3>
            <Badge variant={statusVariant}>{SILENT_VOTE_STATUS_LABEL[detail.status]}</Badge>
          </div>
          {detail.myBallotSubmitted ? (
            <p className="text-xs text-muted-foreground">你已提交选票，可随时改票</p>
          ) : detail.status === 'open' ? (
            <p className="text-xs text-muted-foreground">匿名投票，他人无法看到你的选择</p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => void reload()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SilentVoteBallotForm
          detail={detail}
          optionId={optionId}
          intensity={intensity}
          submitting={submitting}
          onOptionChange={setOptionId}
          onIntensityChange={setIntensity}
          onSubmit={() =>
            void submitBallot({ optionId, intensity }).catch(() => {})
          }
        />

        <SilentVoteAggregateView aggregate={detail.aggregate} />
      </div>

      {effectiveCanManage ? (
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {detail.status === 'draft' ? (
            <Button type="button" size="sm" disabled={submitting} onClick={() => void openVote()}>
              开放投票
            </Button>
          ) : null}
          {detail.status === 'open' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={submitting}
              onClick={async () => {
                await closeVote();
                onClosed?.();
              }}
            >
              关闭并公布结果
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
