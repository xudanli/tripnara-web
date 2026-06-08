/**
 * VERIFY metadata.issues 中 class=ADVISORY 的折叠提示区。
 * 数据源：decision_log[VERIFY]（经 mergeRouteRunDecisionLogs 合并 explain + orchestration）。
 */

import { useState } from 'react';
import type { VerifyIssue } from '@/api/agent';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  advisoryPanelTitle,
  dedupeAdvisoryDisplayLines,
  formatAdvisoryLine,
} from '@/lib/route-run-contract-extract';

const ADVISORY_PROSE = 'min-w-0 break-words [overflow-wrap:anywhere]';

export type AdvisoryIssuesPanelProps = {
  issues: VerifyIssue[];
  /** 草案级排期弱提示：与 advisory 并列展示在面板底部 */
  showDraftHint?: boolean;
  debugUiDefaults?: boolean;
  className?: string;
};

export function AdvisoryIssuesPanel({
  issues,
  showDraftHint = true,
  debugUiDefaults = false,
  className,
}: AdvisoryIssuesPanelProps) {
  const advisories = issues.filter((i) => String(i.class ?? '').toUpperCase() === 'ADVISORY');
  const [open, setOpen] = useState(false);

  if (!advisories.length) return null;

  const lines = dedupeAdvisoryDisplayLines(advisories);
  const title = advisoryPanelTitle(advisories, advisories.length);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn(ADVISORY_PROSE, className)}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto min-h-9 w-full justify-between gap-2 rounded-md border border-amber-200/70 bg-amber-50/30 px-3 py-2 text-left hover:bg-amber-50/50 dark:border-amber-900/45 dark:bg-amber-950/20"
        >
          <span className="flex items-start gap-2 text-xs font-medium text-amber-950 dark:text-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
            <span>{title}</span>
          </span>
          <ChevronRight
            className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="rounded-b-md border border-t-0 border-amber-200/70 bg-amber-50/15 px-3 py-2.5 dark:border-amber-900/45 dark:bg-amber-950/10">
        <ul className="space-y-1.5 text-[11px] text-foreground/90 leading-relaxed">
          {lines.map((line, idx) => (
            <li key={`adv-${idx}-${line.text.slice(0, 24)}`} className="flex gap-1.5">
              <span className="text-muted-foreground shrink-0">·</span>
              <span className={ADVISORY_PROSE}>{formatAdvisoryLine(line)}</span>
            </li>
          ))}
        </ul>

        {showDraftHint ? (
          <p className={cn('mt-2.5 text-[10px] text-muted-foreground leading-relaxed', ADVISORY_PROSE)}>
            当前为草案级排期：建议补充必去点、扩大检索范围，或再发一轮约束说明。
          </p>
        ) : null}

        {debugUiDefaults ? (
          <details className="mt-2 border-t border-dashed border-border/60 pt-2 text-[10px]">
            <summary className="cursor-pointer text-muted-foreground select-none">VERIFY issues（调试）</summary>
            <pre className="mt-1.5 max-h-40 overflow-auto rounded border bg-muted/30 p-2 font-mono leading-snug break-all">
              {JSON.stringify(advisories, null, 2)}
            </pre>
          </details>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
