import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  hasUserNarrative,
  interventionPriorityLabel,
  isTepIntervention,
  pickDeferUserAction,
} from '@/lib/mobile-execution.util';
import type { ExecutionInterventionDto } from '@/types/mobile-execution';
import { ExecutionCausalChainFold, ExecutionUserNarrativeBlock } from './ExecutionNarrativeBlocks';
import { mobileExecutionApi } from '@/api/mobile-execution';

export interface ExecutionInterventionCardProps {
  item: ExecutionInterventionDto;
  tripId: string;
  applying?: boolean;
  onAccept: () => void | Promise<void>;
  onDefer?: () => void | Promise<void>;
  className?: string;
}

export function ExecutionInterventionCard({
  item,
  tripId,
  applying = false,
  onAccept,
  onDefer,
  className,
}: ExecutionInterventionCardProps) {
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceNodes, setTraceNodes] = useState(item.causalChain?.nodes);

  const narrative = hasUserNarrative(item.userNarrative) ? item.userNarrative : null;
  const deferAction = pickDeferUserAction(item.userActions) ?? item.actions.defer;
  const tep = isTepIntervention(item);

  const loadTrace = async () => {
    setTraceLoading(true);
    try {
      const trace = await mobileExecutionApi.getCausalTrace(tripId, item.id);
      setTraceNodes(trace.nodes);
    } finally {
      setTraceLoading(false);
    }
  };

  return (
    <article
      className={cn('rounded-xl border border-border/70 bg-card p-4', className)}
      data-testid={`execution-intervention-${item.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {interventionPriorityLabel(item.priority)}
        </Badge>
        {tep ? (
          <Badge variant="secondary" className="text-[10px]">
            TEP 修复
          </Badge>
        ) : null}
        <Badge variant="outline" className="text-[10px]">
          {item.status}
        </Badge>
      </div>

      {narrative ? (
        <ExecutionUserNarrativeBlock narrative={narrative} className="mt-3" />
      ) : (
        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.reason}</p>
          <p className="text-xs text-muted-foreground">{item.recommendedAction}</p>
        </div>
      )}

      {item.recommendation ? (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/15 p-3 text-xs">
          <p className="font-medium text-foreground">{item.recommendation.title}</p>
          {item.recommendation.summary ? (
            <p className="mt-1 text-muted-foreground">{item.recommendation.summary}</p>
          ) : null}
          {item.recommendation.keeps.length > 0 ? (
            <p className="mt-2 text-muted-foreground">
              保留：{item.recommendation.keeps.join(' · ')}
            </p>
          ) : null}
          {item.recommendation.costs.length > 0 ? (
            <p className="mt-1 text-muted-foreground">
              需接受：{item.recommendation.costs.join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}

      <ExecutionCausalChainFold
        chain={{ ...item.causalChain, nodes: traceNodes ?? item.causalChain?.nodes }}
        onExpandTrace={traceLoading ? undefined : loadTrace}
        className="mt-3"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          disabled={applying || !item.actions.primary.enabled}
          onClick={() => void onAccept()}
        >
          {applying ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          {item.actions.primary.label}
        </Button>
        {deferAction && onDefer ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={applying || deferAction.enabled === false}
            onClick={() => void onDefer()}
          >
            {deferAction.label}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
