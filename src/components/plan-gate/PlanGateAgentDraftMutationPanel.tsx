import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DecisionSpaceItineraryDiffList } from '@/components/decision-problems/DecisionSpaceItineraryDiffList';
import { FeasibilityWriteChainRedirectHint } from '@/components/feasibility-report/FeasibilityWriteChainRedirectHint';
import { agentPlanDraftMutationHasChanges } from '@/lib/agent-plan-draft-mutation.util';
import { cn } from '@/lib/utils';
import type { AgentPlanDraftMutation } from '@/types/agent-plan-draft-mutation';
import { planGateCard, planGateSectionTitle } from './plan-gate-ui';

export interface PlanGateAgentDraftMutationPanelProps {
  tripId: string;
  mutation: AgentPlanDraftMutation;
  className?: string;
}

/** 写链开启：展示 metadata.agentPlanDraftMutation 拟议变更（只读） */
export function PlanGateAgentDraftMutationPanel({
  tripId,
  mutation,
  className,
}: PlanGateAgentDraftMutationPanelProps) {
  const title = mutation.headline ?? 'Agent 拟议变更';
  const hasDiff = agentPlanDraftMutationHasChanges(mutation);

  return (
    <div className={cn(planGateCard, 'border-border/60 bg-muted/15', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={cn(planGateSectionTitle, 'flex items-center gap-1.5')}>
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {title}
          </h3>
          {mutation.summary ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {mutation.summary}
            </p>
          ) : null}
        </div>
        {mutation.status ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {mutation.status}
          </Badge>
        ) : null}
      </div>

      {mutation.itineraryDiff?.length ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">行程 diff</p>
          <DecisionSpaceItineraryDiffList diff={mutation.itineraryDiff} />
        </div>
      ) : null}

      {mutation.timelineChanges?.length ? (
        <ul className="mt-3 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">时间轴变更</p>
          {mutation.timelineChanges.map((change, index) => (
            <li
              key={`${change.kind}-${change.day ?? index}`}
              className="rounded-md border border-border/60 bg-background/80 px-2.5 py-1.5 text-[11px]"
            >
              <span className="font-medium text-foreground">
                {change.day != null ? `Day ${change.day} · ` : ''}
                {change.label ?? change.kind}
              </span>
              {change.before || change.after ? (
                <p className="mt-0.5 text-muted-foreground">
                  {change.before ?? '—'} → {change.after ?? '—'}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {mutation.operations?.length ? (
        <ul className="mt-3 space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">操作</p>
          {mutation.operations.map((op, index) => (
            <li key={`${op.type ?? 'op'}-${index}`} className="text-[11px] text-foreground">
              {op.dayNumber != null ? `Day ${op.dayNumber} · ` : ''}
              {op.label ?? op.type ?? '变更'}
              {op.description ? (
                <span className="text-muted-foreground"> — {op.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!hasDiff && !mutation.summary ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          暂无结构化 diff；正式落盘请走决策 apply。
        </p>
      ) : null}

      <div className="mt-3 border-t border-border/80 pt-3">
        <FeasibilityWriteChainRedirectHint
          tripId={tripId}
          issue={{
            id: mutation.problemId ?? 'agent-plan-draft',
            decisionProblemId: mutation.problemId,
          }}
          compact
        />
      </div>
    </div>
  );
}
