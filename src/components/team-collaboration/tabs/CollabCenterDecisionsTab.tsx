import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StructuredNegotiationPanel } from '@/components/domain-influence/StructuredNegotiationPanel';
import { SilentVoteListPanel } from '@/components/silent-vote/SilentVoteListPanel';
import { useCollabOverview } from '@/hooks/useCollabOverview';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import { trackCollabVoteStart } from '@/utils/collab-center-analytics';
import { workbenchCardFlat } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import { resolveNegotiationTaskId } from '@/lib/collab-negotiation-selection.util';
import { filterDomainInfluenceNegotiationTasks } from '@/lib/collab-collaborative-task-display.util';
import { CollabDecisionStatsRow } from '../widgets/CollabDecisionStatsRow';
import { CollabAiSuggestionsPanel } from '../widgets/CollabAiSuggestionsPanel';
import { CollabDecisionQueuePanel } from '../widgets/CollabDecisionQueuePanel';
import { CollabDecisionFollowUpQueuePanel } from '../widgets/CollabDecisionFollowUpQueuePanel';
import { NegotiationSummaryWidget } from '../widgets/NegotiationSummaryWidget';
import { collabDashboardGrid, collabDashboardSpan } from '../collab-dashboard-layout';

interface CollabCenterDecisionsTabProps {
  tripId: string;
  className?: string;
}

function resolveSelectedTaskId(
  tasks: DomainNegotiationTask[],
  negotiationTaskId: string | null,
  roundId: string | null,
  roundDomain: string | null,
): string | null {
  return resolveNegotiationTaskId(tasks, { negotiationTaskId, roundId, roundDomain });
}

export function CollabCenterDecisionsTab({ tripId, className }: CollabCenterDecisionsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const roundId = searchParams.get('roundId');
  const roundDomain = searchParams.get('roundDomain');
  const negotiationTaskId = searchParams.get('negotiationTaskId');
  const voteIdParam = searchParams.get('voteId');
  const { decisionStats, votes, negotiationTasks, decisionFollowUps, loading } =
    useCollabOverview(tripId);

  const domainNegotiationTasks = useMemo(
    () => filterDomainInfluenceNegotiationTasks(negotiationTasks),
    [negotiationTasks],
  );
  const { openAssistant, sendAssistantMessage } = useAssistantSidebar();
  const voteSectionRef = useRef<HTMLElement>(null);
  const stageSectionRef = useRef<HTMLDivElement>(null);
  const voteDeepLinkConsumedRef = useRef(false);

  const openVote = votes.find((v) => v.status === 'open');

  const selectedTaskId = useMemo(
    () => resolveSelectedTaskId(domainNegotiationTasks, negotiationTaskId, roundId, roundDomain),
    [domainNegotiationTasks, negotiationTaskId, roundId, roundDomain],
  );

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

  const activeTask = useMemo(
    () => domainNegotiationTasks.find((t) => t.id === selectedTaskId) ?? null,
    [domainNegotiationTasks, selectedTaskId],
  );

  const discussTopic = openVote?.title ?? activeTask?.title ?? '团队协商';

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

  return (
    <div className={cn('space-y-4', className)}>
      <CollabDecisionStatsRow stats={decisionStats} />

      <div className={collabDashboardGrid}>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <div className="space-y-4">
            <CollabDecisionFollowUpQueuePanel
              tripId={tripId}
              tasks={decisionFollowUps}
              loading={loading}
            />
            <CollabDecisionQueuePanel
              tasks={domainNegotiationTasks}
              selectedTaskId={selectedTaskId}
              loading={loading}
              onSelectTask={handleSelectQueueTask}
            />
          </div>
        </div>

        <div ref={stageSectionRef} className={collabDashboardSpan({ md: 6, lg: 5 })}>
          <StructuredNegotiationPanel
            tripId={tripId}
            initialRoundId={roundId}
            initialRoundDomain={roundDomain}
            initialNegotiationTaskId={negotiationTaskId}
            hideTaskList
            collabStage
            onStartVote={() => {
              if (openVote) {
                handleVoteOpen(openVote.id);
              }
              voteSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            onGenerateCompromise={handleGenerateCompromise}
            onDiscussWithAssistant={handleDiscussWithAssistant}
            voteActionDisabled={!openVote}
          />
        </div>

        <div className={collabDashboardSpan({ md: 6, lg: 3 })}>
          <CollabAiSuggestionsPanel
            tripId={tripId}
            onStartNegotiation={() => {
              stageSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onStartVote={() => {
              if (openVote) {
                handleVoteOpen(openVote.id);
              }
              voteSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            onGenerateCompromise={handleGenerateCompromise}
            onDiscussWithAssistant={handleDiscussWithAssistant}
          />
        </div>

        <div className={collabDashboardSpan({ md: 6, lg: 6 })}>
          <NegotiationSummaryWidget tasks={domainNegotiationTasks} />
        </div>

        <div className={collabDashboardSpan({ md: 6, lg: 6 })}>
          <section ref={voteSectionRef} className={cn(workbenchCardFlat, 'h-full p-4')}>
            <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">团队投票</h3>
            <SilentVoteListPanel
              tripId={tripId}
              showCreate
              initialVoteId={voteIdParam}
              onInitialVoteConsumed={handleInitialVoteConsumed}
              onVoteOpen={handleVoteOpen}
              onVoteClose={clearVoteDeepLink}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
