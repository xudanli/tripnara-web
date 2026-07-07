import { useMemo, useState } from 'react';
import { ChevronDown, Focus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import GuardianNegotiationPanel from '@/components/readiness/GuardianNegotiationPanel';
import {
  feasibilityGuardianSummaryLine,
  resolveFeasibilityGuardianPresentation,
  type FeasibilityGuardianDisplayMode,
} from '@/lib/feasibility-guardian-display';
import { cn } from '@/lib/utils';
import type { PreviewRepairResponse } from '@/types/feasibility-repair';
import type { GuardianNegotiationResult } from '@/types/readiness-guardian-negotiation';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

interface FeasibilityGuardianRepairPanelProps {
  mode: FeasibilityGuardianDisplayMode;
  negotiation: GuardianNegotiationResult;
  issue?: FeasibilityIssueDto | null;
  preview?: PreviewRepairResponse | null;
  isMock?: boolean;
  className?: string;
}

function RepairFocusChip({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/70 bg-background/80 px-2.5 py-2">
      <Focus className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          当前处理
        </p>
        <p className="text-xs text-foreground leading-relaxed">{label}</p>
      </div>
    </div>
  );
}

export function FeasibilityGuardianRepairPanel({
  mode,
  negotiation,
  issue,
  preview,
  isMock,
  className,
}: FeasibilityGuardianRepairPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const presentation = useMemo(
    () => resolveFeasibilityGuardianPresentation({ issue, preview, guardian: negotiation }),
    [issue, preview, negotiation],
  );

  if (mode === 'hidden') return null;

  const showRepairFocus =
    presentation.repairFocusLabel && presentation.scope !== 'repair';

  if (mode === 'full') {
    return (
      <div className={cn('space-y-2', className)}>
        {showRepairFocus && presentation.repairFocusLabel ? (
          <RepairFocusChip label={presentation.repairFocusLabel} />
        ) : null}
        <GuardianNegotiationPanel
          negotiation={negotiation}
          isMock={isMock}
          title={presentation.title}
          description={presentation.contextHint}
          scopeBadge={presentation.scopeBadge}
        />
      </div>
    );
  }

  const summary = feasibilityGuardianSummaryLine(negotiation, presentation);

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className={cn('rounded-lg border border-border/60 bg-muted/15', className)}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {presentation.title}
            </p>
            <Badge variant="secondary" className="text-[10px] h-5 font-normal">
              {presentation.scopeBadge}
            </Badge>
          </div>
          {showRepairFocus && presentation.repairFocusLabel ? (
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              当前处理：{presentation.repairFocusLabel}
            </p>
          ) : null}
          <p className="text-xs text-foreground/90 leading-relaxed">{summary}</p>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs px-2">
            {expanded ? '收起' : '展开'}
            <ChevronDown
              className={cn('ml-1 h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="px-3 pb-3 pt-0 space-y-2">
        {showRepairFocus && presentation.repairFocusLabel ? (
          <RepairFocusChip label={presentation.repairFocusLabel} />
        ) : null}
        <GuardianNegotiationPanel
          negotiation={negotiation}
          isMock={isMock}
          title={presentation.title}
          description={presentation.contextHint}
          scopeBadge={presentation.scopeBadge}
          embedded
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
