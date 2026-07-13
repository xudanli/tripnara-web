import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  alertLevelBadgeClass,
  hasUserNarrative,
  pickPrimaryUserAction,
} from '@/lib/mobile-execution.util';
import type {
  ExecutionAlertDto,
  ExecutionInterventionCausalChainDto,
  ExecutionUserNarrativeDto,
} from '@/types/mobile-execution';

export function ExecutionUserNarrativeBlock({
  narrative,
  className,
}: {
  narrative: ExecutionUserNarrativeDto;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2 text-sm', className)}>
      {narrative.whatHappened ? (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            发生了什么
          </p>
          <p className="mt-0.5 text-foreground">{narrative.whatHappened}</p>
        </div>
      ) : null}
      {narrative.impactOnTrip ? (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            对行程的影响
          </p>
          <p className="mt-0.5 text-foreground">{narrative.impactOnTrip}</p>
        </div>
      ) : null}
      {narrative.recommendation ? (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            建议
          </p>
          <p className="mt-0.5 text-foreground">{narrative.recommendation}</p>
        </div>
      ) : null}
      {narrative.affected?.route ? (
        <p className="text-xs text-muted-foreground">路线：{narrative.affected.route}</p>
      ) : null}
    </div>
  );
}

export function ExecutionCausalChainFold({
  chain,
  onExpandTrace,
  className,
}: {
  chain?: ExecutionInterventionCausalChainDto;
  onExpandTrace?: () => void;
  className?: string;
}) {
  if (!chain?.headline && !chain?.nodes?.length) return null;

  return (
    <details className={cn('rounded-lg border border-border/60 bg-muted/10 px-3 py-2', className)}>
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        为什么（因果链）
      </summary>
      <div className="mt-2 space-y-2 text-xs text-muted-foreground">
        {chain.headline ? <p className="text-foreground">{chain.headline}</p> : null}
        {chain.assessment ? <p>{chain.assessment}</p> : null}
        {chain.nodes?.map((node) => (
          <div key={node.id}>
            <p className="font-medium text-foreground">{node.label}</p>
            {node.detail ? <p>{node.detail}</p> : null}
          </div>
        ))}
        {onExpandTrace ? (
          <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={onExpandTrace}>
            查看完整回放
          </button>
        ) : null}
      </div>
    </details>
  );
}

export function ExecutionAlertCard({
  alert,
  impacts,
  isPrimary = false,
  onPrimaryAction,
  className,
}: {
  alert: ExecutionAlertDto;
  impacts?: Array<{ id: string; label: string }>;
  isPrimary?: boolean;
  onPrimaryAction?: () => void;
  className?: string;
}) {
  const narrative = hasUserNarrative(alert.userNarrative) ? alert.userNarrative : null;
  const primaryAction = pickPrimaryUserAction(alert.userActions);

  return (
    <article
      className={cn(
        'rounded-xl border p-4',
        alertLevelBadgeClass(alert.level),
        className,
      )}
      data-testid={`execution-alert-${alert.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {alert.level}
        </Badge>
        {alert.requiresImmediateAttention ? (
          <Badge variant="destructive" className="text-[10px]">
            需立即关注
          </Badge>
        ) : null}
        {isPrimary ? (
          <Badge variant="secondary" className="text-[10px]">
            主要风险
          </Badge>
        ) : null}
      </div>

      {narrative ? (
        <ExecutionUserNarrativeBlock narrative={narrative} className="mt-3" />
      ) : (
        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{alert.title}</h3>
          <p className="text-sm text-muted-foreground">{alert.reason}</p>
          {alert.impact ? <p className="text-xs text-muted-foreground">{alert.impact}</p> : null}
        </div>
      )}

      {isPrimary && impacts && impacts.length > 0 ? (
        <div className="mt-3 rounded-lg border border-border/50 bg-background/40 p-2">
          <p className="text-[10px] font-medium text-muted-foreground">派生影响</p>
          <ul className="mt-1 space-y-1">
            {impacts.map((impact) => (
              <li key={impact.id} className="text-xs text-foreground">
                · {impact.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ExecutionCausalChainFold chain={alert.causalChain} className="mt-3" />

      {primaryAction && onPrimaryAction ? (
        <button
          type="button"
          className="mt-3 text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={onPrimaryAction}
        >
          {primaryAction.label}
        </button>
      ) : null}
    </article>
  );
}
