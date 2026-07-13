import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SilentVoteListPanel } from '@/components/silent-vote/SilentVoteListPanel';
import { SilentVoteCreateDialog } from '@/components/silent-vote/SilentVoteCreateDialog';
import { Spinner } from '@/components/ui/spinner';
import { useSilentVoteList } from '@/hooks/useSilentVotes';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import { trackCollabVoteStart } from '@/utils/collab-center-analytics';
import { collabPageStack } from '../collab-dashboard-layout';
import { AdvisorVotesEmptyState } from '../widgets/AdvisorVotesEmptyState';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabCenterAdvisorVotesTabProps {
  tripId: string;
  /** 页头「新增投票」触发 */
  createVoteNonce?: number;
  onOpenRoleInvites?: () => void;
  className?: string;
}

/** 顾问制：仅团队投票（无领域协商） */
export function CollabCenterAdvisorVotesTab({
  tripId,
  createVoteNonce = 0,
  onOpenRoleInvites,
  className,
}: CollabCenterAdvisorVotesTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const voteIdParam = searchParams.get('voteId');
  const voteDeepLinkConsumedRef = useRef(false);
  const { items, loading, reload } = useSilentVoteList(tripId);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (createVoteNonce > 0) {
      setCreateOpen(true);
    }
  }, [createVoteNonce]);

  const clearVoteDeepLink = useCallback(() => {
    if (!searchParams.get('voteId')) return;
    const next = mergeCollabDeepLink(searchParams, { voteId: null });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleVoteOpen = useCallback(
    (voteId: string) => {
      trackCollabVoteStart({ tripId, voteId });
      const next = mergeCollabDeepLink(searchParams, {
        collabTab: 'decisions',
        voteId,
      });
      setSearchParams(next, { replace: true });
    },
    [tripId, searchParams, setSearchParams],
  );

  const handleInitialVoteConsumed = useCallback(() => {
    if (voteIdParam && !voteDeepLinkConsumedRef.current) {
      voteDeepLinkConsumedRef.current = true;
      trackCollabVoteStart({ tripId, voteId: voteIdParam });
    }
  }, [tripId, voteIdParam]);

  const handleCreated = useCallback(
    (voteId: string) => {
      void reload();
      handleVoteOpen(voteId);
    },
    [reload, handleVoteOpen],
  );

  const isEmpty = !loading && items.length === 0;

  return (
    <div className={cn(collabPageStack, className)}>
      <section className={cn(workbenchCard, 'p-3')}>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">团队投票</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          发起投票收集成员选择，结果可用于顾问定案（不含领域协商与决策画像问卷）。
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <AdvisorVotesEmptyState
            className="mt-1"
            onCreate={() => setCreateOpen(true)}
            onGoInvites={onOpenRoleInvites}
          />
        ) : (
          <div className="mt-3">
            <SilentVoteListPanel
              tripId={tripId}
              showCreate
              initialVoteId={voteIdParam}
              onInitialVoteConsumed={handleInitialVoteConsumed}
              onVoteOpen={handleVoteOpen}
              onVoteClose={clearVoteDeepLink}
            />
          </div>
        )}
      </section>

      <SilentVoteCreateDialog
        tripId={tripId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
