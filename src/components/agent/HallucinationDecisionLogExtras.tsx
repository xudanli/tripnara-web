/**
 * HALLUCINATION_DETECTION 决策日志：长 outputs_summary + metadata.hallucination_audit_zh 折叠展示。
 */

import { useState } from 'react';
import type { DecisionLogEntry, HallucinationAuditZh, HallucinationAuditSampleRowZh } from '@/api/agent';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function isHallucinationDetectionDecisionLog(log: Pick<DecisionLogEntry, 'step'>): boolean {
  return String(log.step ?? '').toUpperCase() === 'HALLUCINATION_DETECTION';
}

function pickHallucinationAuditZh(
  metadata: DecisionLogEntry['metadata'] | undefined
): HallucinationAuditZh | null {
  if (!metadata) return null;
  const raw =
    (metadata as { hallucination_audit_zh?: unknown }).hallucination_audit_zh ??
    (metadata as { hallucinationAuditZh?: unknown }).hallucinationAuditZh;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as HallucinationAuditZh;
}

function normalizeSampleRows(a: HallucinationAuditZh): { outcome: string; excerpt: string }[] {
  const rows = (a.sample_rows ?? a.sampleRows ?? []) as HallucinationAuditSampleRowZh[];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r, i) => {
      const o = r as Record<string, unknown>;
      const outcome = String(
        o.outcome_zh ?? o.outcomeZh ?? o.outcome ?? `样例${i + 1}`
      ).trim();
      const excerpt = String(o.excerpt_zh ?? o.excerptZh ?? o.excerpt ?? '').trim();
      return { outcome, excerpt };
    })
    .filter((r) => r.outcome.length > 0 || r.excerpt.length > 0);
}

function hasRenderableAudit(a: HallucinationAuditZh): boolean {
  const notify = (a.user_notification ?? a.userNotification ?? '').toString().trim();
  if (notify.length > 0) return true;
  if (a.total != null || a.verified != null || a.risks != null) return true;
  if (a.removed_count != null || a.removedCount != null) return true;
  if (a.flagged_count != null || a.flaggedCount != null) return true;
  if (normalizeSampleRows(a).length > 0) return true;
  if (a.duration_ms != null || a.durationMs != null) return true;
  if (a.statistics && typeof a.statistics === 'object' && Object.keys(a.statistics).length > 0) return true;
  return false;
}

export function HallucinationDecisionLogExtras({ log }: { log: DecisionLogEntry }) {
  if (!isHallucinationDetectionDecisionLog(log)) return null;
  const audit = pickHallucinationAuditZh(log.metadata);
  if (!audit || !hasRenderableAudit(audit)) return null;

  const [open, setOpen] = useState(false);
  const notify = String(audit.user_notification ?? audit.userNotification ?? '').trim();
  const rows = normalizeSampleRows(audit);
  const duration = audit.duration_ms ?? audit.durationMs;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-1.5">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-between px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1 min-w-0">
            <ChevronRight className={cn('w-3 h-3 shrink-0 transition-transform', open && 'rotate-90')} />
            <span className="truncate">结构化明细（metadata.hallucination_audit_zh）</span>
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-md border border-border/60 bg-background/60 px-2 py-2 space-y-2 text-[11px]">
        {notify ? (
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
            <span className="font-medium text-foreground">提示 · </span>
            {notify}
          </p>
        ) : null}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-muted-foreground">
          {audit.total != null ? (
            <div>
              <span className="font-medium text-foreground/85">抽取陈述</span> {audit.total}
            </div>
          ) : null}
          {audit.verified != null ? (
            <div>
              <span className="font-medium text-foreground/85">与证据一致</span> {audit.verified}
            </div>
          ) : null}
          {audit.risks != null ? (
            <div>
              <span className="font-medium text-foreground/85">风险相关</span> {audit.risks}
            </div>
          ) : null}
          {audit.flagged_count != null || audit.flaggedCount != null ? (
            <div>
              <span className="font-medium text-foreground/85">已标注存疑/弱化</span>{' '}
              {audit.flagged_count ?? audit.flaggedCount}
            </div>
          ) : null}
          {audit.removed_count != null || audit.removedCount != null ? (
            <div>
              <span className="font-medium text-foreground/85">已移除或改写</span>{' '}
              {audit.removed_count ?? audit.removedCount}
            </div>
          ) : null}
          {duration != null && duration >= 0 ? (
            <div>
              <span className="font-medium text-foreground/85">本步耗时</span> {duration}ms
            </div>
          ) : null}
        </div>
        {rows.length > 0 ? (
          <div>
            <div className="font-medium text-foreground/85 mb-1">抽查摘录</div>
            <ul className="space-y-1.5 text-muted-foreground leading-relaxed">
              {rows.map((r, i) => (
                <li key={i} className="border-l-2 border-primary/20 pl-2">
                  <span className="font-medium text-foreground/80">「{r.outcome}」</span>
                  {r.excerpt ? <span className="whitespace-pre-wrap">{r.excerpt}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {audit.statistics && typeof audit.statistics === 'object' ? (
          <details className="text-[10px] text-muted-foreground">
            <summary className="cursor-pointer select-none text-foreground/80">statistics（原始）</summary>
            <pre className="mt-1 max-h-32 overflow-auto rounded border bg-muted/30 p-1.5 font-mono">
              {JSON.stringify(audit.statistics, null, 2)}
            </pre>
          </details>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
