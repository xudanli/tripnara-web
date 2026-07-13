import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { StructuredNegotiationPanel } from '@/components/domain-influence/StructuredNegotiationPanel';
import { SilentVoteDialog } from '@/components/silent-vote/SilentVoteDialog';
import { SilentVoteCreateDialog } from '@/components/silent-vote/SilentVoteCreateDialog';
import { useCollabOverview } from '@/hooks/useCollabOverview';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import { trackCollabVoteStart } from '@/utils/collab-center-analytics';
import { cn } from '@/lib/utils';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import { resolveNegotiationTaskId } from '@/lib/collab-negotiation-selection.util';
import { filterDomainInfluenceNegotiationTasks } from '@/lib/collab-collaborative-task-display.util';
import { collabColumnStack, collabDecisionsGrid, collabPageStack } from '../collab-dashboard-layout';
import { CollabDecisionStatusBanner } from '../widgets/CollabDecisionStatusBanner';
import { CollabAiSuggestionsPanel } from '../widgets/CollabAiSuggestionsPanel';
import { CollabDecisionQueuePanel } from '../widgets/CollabDecisionQueuePanel';
import { CollabTeamVoteLeanWidget } from '../widgets/CollabTeamVoteLeanWidget';
import { Spinner } from '@/components/ui/spinner';

interface CollabCenterDecisionsTabProps {
  tripId: string;
  className?: string;
  /** 页头「新增投票」触发 */
  createVoteNonce?: number;
  /** 顶部状态栏「开始新协商」 */
  onStartNegotiation?: () => void;
}

function resolveSelectedTaskId(
  tasks: DomainNegotiationTask[],
  negotiationTaskId: string | null,
  roundId: string | null,
  roundDomain: string | null,
): string | null {
  return resolveNegotiationTaskId(tasks, { negotiationTaskId, roundId, roundDomain });
}

export function CollabCenterDecisionsTab({
  tripId,
  className,
  createVoteNonce = 0,
  onStartNegotiation,
}: CollabCenterDecisionsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const roundId = searchParams.get('roundId');
  const roundDomain = searchParams.get('roundDomain');
  const negotiationTaskId = searchParams.get('negotiationTaskId');
  const voteIdParam = searchParams.get('voteId');
  const {
    decisionStats,
    votes,
    negotiationTasks,
    loading,
    friction,
    reloadVotes,
  } = useCollabOverview(tripId);

  const domainNegotiationTasks = useMemo(
    () => filterDomainInfluenceNegotiationTasks(negotiationTasks),
    [negotiationTasks],
  );
  const { openAssistant, sendAssistantMessage } = useAssistantSidebar();
  const stageSectionRef = useRef<HTMLDivElement>(null);
  const voteDeepLinkConsumedRef = useRef(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [createVoteOpen, setCreateVoteOpen] = useState(false);
  const [activeVoteId, setActiveVoteId] = useState<string | null>(null);

  const openVote = votes.find((v) => v.status === 'open');

  const selectedTaskId = useMemo(
    () => resolveSelectedTaskId(domainNegotiationTasks, negotiationTaskId, roundId, roundDomain),
    [domainNegotiationTasks, negotiationTaskId, roundId, roundDomain],
  );

  const activeTask = useMemo(
    () => domainNegotiationTasks.find((t) => t.id === selectedTaskId) ?? domainNegotiationTasks[0] ?? null,
    [domainNegotiationTasks, selectedTaskId],
  );

  const discussTopic = openVote?.title ?? activeTask?.title ?? '团队协商';

  const handleSelectQueueTask = useCallback(
    (task: DomainNegotiationTask) => {
      const next = mergeCollabDeepLink(searchParams, {
        collabTab: 'decisions',
        negotiationTaskId: task.id,
        roundId: task.status === 'in_discussion' ? (task.activeRoundId ?? null) : null,
        roundDomain: task.domain,
      });
      setSearchParams(next, { replace: true });
      window.requestAnimationFrame(() => {
        stageSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [searchParams, setSearchParams],
  );

  const handleDiscussWithAssistant = useCallback(() => {
    openAssistant();
    sendAssistantMessage(`关于「${discussTopic}」，请帮我分析各方观点并给出妥协建议。`);
  }, [openAssistant, sendAssistantMessage, discussTopic]);

  const handleGenerateCompromise = useCallback(() => {
    openAssistant();
    sendAssistantMessage(
      `请针对「${discussTopic}」生成 2–3 个可执行的妥协方案，并说明对各成员的影响。`,
    );
  }, [openAssistant, sendAssistantMessage, discussTopic]);

  const handleReachConsensus = useCallback(() => {
    toast.success('共识方案已记录，将写回行程规划（需后端确认接口）');
  }, []);

  const clearVoteDeepLink = useCallback(() => {
    if (!searchParams.get('voteId')) return;
    const next = mergeCollabDeepLink(searchParams, { voteId: null });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleVoteOpen = useCallback(
    (voteId: string) => {
      trackCollabVoteStart({ tripId, voteId });
      setActiveVoteId(voteId);
      setVoteDialogOpen(true);
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
      setActiveVoteId(voteIdParam);
      setVoteDialogOpen(true);
    }
  }, [tripId, voteIdParam]);

  const handleVoteCreated = useCallback(
    async (voteId: string) => {
      setCreateVoteOpen(false);
      await reloadVotes();
      handleVoteOpen(voteId);
    },
    [reloadVotes, handleVoteOpen],
  );

  useEffect(() => {
    handleInitialVoteConsumed();
  }, [handleInitialVoteConsumed]);

  useEffect(() => {
    if (createVoteNonce > 0) {
      setCreateVoteOpen(true);
    }
  }, [createVoteNonce]);

  if (loading && domainNegotiationTasks.length === 0) {
    return (
      <div className={cn('flex justify-center py-16', className)}>
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn(collabPageStack, className)}>
      <CollabDecisionStatusBanner
        stats={decisionStats}
        tasks={domainNegotiationTasks}
        alerts={friction?.highRiskAlerts}
        onStartNegotiation={onStartNegotiation}
      />

      <div className={collabDecisionsGrid}>
        <aside className={cn(collabColumnStack, 'xl:col-span-3')}>
          <CollabDecisionQueuePanel
            tasks={domainNegotiationTasks}
            votes={votes}
            selectedTaskId={selectedTaskId}
            loading={loading}
            onSelectTask={handleSelectQueueTask}
          />
        </aside>

        <main ref={stageSectionRef} className="xl:col-span-6">
          <StructuredNegotiationPanel
            tripId={tripId}
            initialRoundId={roundId}
            initialRoundDomain={roundDomain}
            initialNegotiationTaskId={negotiationTaskId ?? activeTask?.id ?? null}
            hideTaskList
            collabStage
            className="min-h-[520px]"
            onStartVote={() => {
              if (openVote) handleVoteOpen(openVote.id);
            }}
            onGenerateCompromise={handleGenerateCompromise}
            onDiscussWithAssistant={handleDiscussWithAssistant}
            onReachConsensus={handleReachConsensus}
            voteActionDisabled={!openVote}
          />
        </main>

        <aside className={cn(collabColumnStack, 'xl:col-span-3')}>
          <CollabAiSuggestionsPanel
            tripId={tripId}
            activeTask={activeTask}
            onStartVote={() => {
              if (openVote) handleVoteOpen(openVote.id);
            }}
            onGenerateCompromise={handleGenerateCompromise}
            onDiscussWithAssistant={handleDiscussWithAssistant}
          />
          <CollabTeamVoteLeanWidget votes={votes} onOpenVote={handleVoteOpen} />
        </aside>
      </div>

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        协商与投票数据实时同步；AI 建议仅供参考，最终决策请由团队共同确认。
      </p>

      <SilentVoteCreateDialog
        tripId={tripId}
        open={createVoteOpen}
        onOpenChange={setCreateVoteOpen}
        onCreated={(voteId) => void handleVoteCreated(voteId)}
      />

      <SilentVoteDialog
        tripId={tripId}
        voteId={activeVoteId ?? voteIdParam}
        open={voteDialogOpen || Boolean(voteIdParam)}
        onOpenChange={(open) => {
          setVoteDialogOpen(open);
          if (!open) {
            setActiveVoteId(null);
            clearVoteDeepLink();
          }
        }}
      />
    </div>
  );
}
