import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  listDecisionLedgerLinksForDisplay,
  type DecisionLedgerCausalityView,
} from '@/lib/decision-ledger-causality.util';

export interface DecisionLedgerDecisionLinksProps {
  causality: DecisionLedgerCausalityView | null | undefined;
  onOpenDecision?: (decisionId: string, ledgerNodeId: string) => void;
  compact?: boolean;
  className?: string;
  title?: string;
}

export function DecisionLedgerDecisionLinks({
  causality,
  onOpenDecision,
  compact = false,
  className,
  title = 'Ledger 节点 → 用户决策',
}: DecisionLedgerDecisionLinksProps) {
  const links = listDecisionLedgerLinksForDisplay(causality);
  if (!causality || links.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-foreground/90">{title}</p>
        {causality.healingStatus ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {causality.healingStatus}
          </Badge>
        ) : null}
      </div>

      {causality.affectedNodeIds?.length && !compact ? (
        <p className="text-[11px] text-muted-foreground">
          受影响节点 · {causality.affectedNodeIds.join('、')}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {links.map((link) => (
          <li
            key={`${link.ledgerNodeId}-${link.decisionId}`}
            className="flex flex-wrap items-center gap-2 rounded border border-border/70 bg-background/60 px-2 py-1.5 text-[11px]"
          >
            <code className="font-mono">{link.ledgerNodeId}</code>
            <span className="text-muted-foreground">→</span>
            <code className="font-mono">{link.decisionId}</code>
            {onOpenDecision ? (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[11px]"
                onClick={() => onOpenDecision(link.decisionId, link.ledgerNodeId)}
              >
                查看决策
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
