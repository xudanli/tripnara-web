import { useEffect, useState } from 'react';
import { ChevronRight, Plus, Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { SILENT_VOTE_STATUS_LABEL } from '@/lib/silent-vote-labels';
import { useSilentVoteList } from '@/hooks/useSilentVotes';
import { SilentVoteCreateDialog } from './SilentVoteCreateDialog';
import { SilentVoteDialog } from './SilentVoteDialog';

interface SilentVoteListPanelProps {
  tripId: string;
  className?: string;
  showCreate?: boolean;
  /** URL 深链 ?voteId= */
  initialVoteId?: string | null;
  onInitialVoteConsumed?: () => void;
  onVoteOpen?: (voteId: string) => void;
  onVoteClose?: () => void;
}

export function SilentVoteListPanel({
  tripId,
  className,
  showCreate = true,
  initialVoteId,
  onInitialVoteConsumed,
  onVoteOpen,
  onVoteClose,
}: SilentVoteListPanelProps) {
  const { items, loading, reload } = useSilentVoteList(tripId);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeVoteId, setActiveVoteId] = useState<string | null>(null);

  const openVote = (voteId: string) => {
    setActiveVoteId(voteId);
    setDetailOpen(true);
    onVoteOpen?.(voteId);
  };

  useEffect(() => {
    if (!initialVoteId || loading) return;
    const exists = items.some((v) => v.id === initialVoteId);
    if (!exists) return;
    openVote(initialVoteId);
    onInitialVoteConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅深链首次打开
  }, [initialVoteId, loading, items.length]);

  const handleCreated = (voteId: string) => {
    void reload();
    openVote(voteId);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setActiveVoteId(null);
      onVoteClose?.();
      void reload();
    }
  };

  return (
    <>
      <section className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
        <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Vote className="h-4 w-4 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold">Silent Vote · 团队投票</h3>
              <p className="text-xs text-muted-foreground">匿名表达倾向与在意程度</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {showCreate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                创建投票
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void reload()}>
              刷新
            </Button>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">暂无投票</p>
              <p className="mt-1 text-xs text-muted-foreground">
                可在方案对比页发起，或点击「创建投票」手动添加选项
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((vote) => (
                <li key={vote.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                    onClick={() => openVote(vote.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{vote.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {SILENT_VOTE_STATUS_LABEL[vote.status]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {vote.aggregate.submittedCount}/{vote.aggregate.eligibleCount} 人已投票
                        {vote.myBallotSubmitted
                          ? ' · 你已投票'
                          : vote.status === 'open'
                            ? ' · 待你投票'
                            : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <SilentVoteCreateDialog
        tripId={tripId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <SilentVoteDialog
        tripId={tripId}
        voteId={activeVoteId}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </>
  );
}
