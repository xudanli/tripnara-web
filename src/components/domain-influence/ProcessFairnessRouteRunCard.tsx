import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Handshake, Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SilentVoteCreateDialog } from '@/components/silent-vote/SilentVoteCreateDialog';
import { SilentVoteDialog } from '@/components/silent-vote/SilentVoteDialog';
import { cn } from '@/lib/utils';
import { buildStructuredNegotiationUrl } from '@/lib/process-fairness-navigation';
import type { SilentVoteCreateDraft } from '@/lib/decision-space-vote.util';
import type { ProcessFairnessPayload } from '@/types/process-fairness';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { TripDomain } from '@/types/trip-domain-influence';
import { PreferenceRoundDiscussionPanel } from './PreferenceRoundDiscussionPanel';
import { negotiationStatusClass } from './domain-influence-ui';

const DECISION_NODE_TITLE: Record<string, string> = {
  destination: '目的地偏好',
  accommodation: '住宿偏好',
  activity: '活动偏好',
  budget: '预算偏好',
};

function resolveTripId(payload: ProcessFairnessPayload): string | null {
  return payload.clientNavigation?.tripId ?? payload.round?.tripId ?? null;
}

function resolveRoundId(payload: ProcessFairnessPayload): string | null {
  return payload.clientNavigation?.roundId ?? payload.roundId ?? payload.round?.id ?? null;
}

function stubNegotiationTask(payload: ProcessFairnessPayload): DomainNegotiationTask {
  const domain = (payload.clientNavigation?.domain ?? payload.round?.domain ?? 'activities') as TripDomain;
  const node = String(payload.decisionNode ?? payload.round?.decisionNode ?? '').trim();
  const title = DECISION_NODE_TITLE[node] ?? (node ? node : '偏好协商');
  const roundId = resolveRoundId(payload);
  const status =
    payload.status === 'SCAFFOLD' && !roundId ? 'pending' : 'in_discussion';
  let taskIdSuffix = 'scaffold';
  if (roundId) {
    taskIdSuffix = roundId;
  } else if (node) {
    taskIdSuffix = node;
  }

  return {
    id: `process-fairness-${taskIdSuffix}`,
    domain,
    title,
    status,
    statusLabel:
      payload.round?.statusLabel ??
      (payload.status === 'SCAFFOLD' ? '讨论框架' : '讨论中'),
    crossLevel: 'medium',
    closesAt: payload.round?.closesAt ?? null,
    activeRoundId: roundId,
  };
}

interface ProcessFairnessRouteRunCardProps {
  payload: ProcessFairnessPayload;
  className?: string;
}

/** route_and_run payload.process_fairness：Plan Studio 助手气泡内主 UI */
export function ProcessFairnessRouteRunCard({ payload, className }: ProcessFairnessRouteRunCardProps) {
  const tripId = resolveTripId(payload);
  const roundId = resolveRoundId(payload);
  const task = stubNegotiationTask(payload);
  const teamTabUrl = buildStructuredNegotiationUrl(payload);

  const [createVoteOpen, setCreateVoteOpen] = useState(false);
  const [voteDetailOpen, setVoteDetailOpen] = useState(false);
  const [activeVoteId, setActiveVoteId] = useState<string | null>(null);

  const voteDraft = useMemo((): SilentVoteCreateDraft => {
    const title = task.title?.trim() || '方案选择';
    return {
      title,
      question: payload.agentIntroZh?.trim() || `请就「${title}」匿名选择更倾向的方案`,
      autoOpen: true,
    };
  }, [task.title, payload.agentIntroZh]);

  const handleStartVote = useCallback(() => {
    setCreateVoteOpen(true);
  }, []);

  const handleVoteCreated = useCallback((voteId: string) => {
    setCreateVoteOpen(false);
    setActiveVoteId(voteId);
    setVoteDetailOpen(true);
  }, []);

  if (!tripId) return null;

  return (
    <Card className={cn('shadow-none border-primary/25 bg-primary/[0.03]', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Handshake className="h-4 w-4 shrink-0" aria-hidden />
          结构化协商
          <Badge
            variant="outline"
            className={cn('text-[10px] font-normal', negotiationStatusClass(task.status))}
          >
            {task.statusLabel}
          </Badge>
        </CardTitle>
        {payload.agentIntroZh ? (
          <CardDescription className="text-xs leading-relaxed text-muted-foreground">
            {payload.agentIntroZh}
          </CardDescription>
        ) : (
          <CardDescription className="text-xs">
            邀请大家一起说说偏好，按轮次公平发言。
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <PreferenceRoundDiscussionPanel
          tripId={tripId}
          task={task}
          roundId={roundId}
          onStartVote={handleStartVote}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="h-8 text-xs" onClick={handleStartVote}>
            <Vote className="h-3.5 w-3.5 mr-1.5 shrink-0" aria-hidden />
            发起投票
          </Button>
          {teamTabUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('plan-studio:open-structured-negotiation', {
                      detail: { tripId, roundId, domain: payload.clientNavigation?.domain },
                    }),
                  );
                }
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 shrink-0" aria-hidden />
              打开完整协商
            </Button>
          ) : null}
        </div>
      </CardContent>

      <SilentVoteCreateDialog
        tripId={tripId}
        open={createVoteOpen}
        onOpenChange={setCreateVoteOpen}
        draft={voteDraft}
        onCreated={handleVoteCreated}
      />
      <SilentVoteDialog
        tripId={tripId}
        voteId={activeVoteId}
        open={voteDetailOpen}
        onOpenChange={(open) => {
          setVoteDetailOpen(open);
          if (!open) setActiveVoteId(null);
        }}
      />
    </Card>
  );
}
