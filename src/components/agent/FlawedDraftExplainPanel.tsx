/**
 * explain / Banner 共用 flawed_draft_v1.reasons 数据源
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { flawedDraftReasonLabel } from '@/lib/flawed-draft-ui';
import type { FlawedDraftDescriptorV1 } from '@/types/flawed-draft';

export interface FlawedDraftExplainPanelProps {
  draft: FlawedDraftDescriptorV1;
  debugUiDefaults?: boolean;
  embedded?: boolean;
  className?: string;
}

export function FlawedDraftExplainPanel({
  draft,
  debugUiDefaults,
  embedded,
  className,
}: FlawedDraftExplainPanelProps) {
  if (!draft.reasons.length && !draft.unresolved_verification_codes?.length) return null;

  return (
    <div
      className={cn(
        embedded
          ? 'rounded-md border border-amber-500/25 bg-background/70 px-2.5 py-2'
          : 'rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5',
        className
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
        瑕疵原因
      </div>
      <ul className="space-y-1.5">
        {draft.reasons.map((reason, idx) => (
          <li key={`${reason.code}-${idx}`} className="text-xs leading-relaxed">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] h-4 font-mono">
                {reason.code}
              </Badge>
              <span className="text-foreground">{flawedDraftReasonLabel(reason)}</span>
            </div>
            {reason.detail_zh &&
            reason.detail_zh.trim() !== flawedDraftReasonLabel(reason) ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground pl-0.5">
                {reason.detail_zh.trim()}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {draft.unresolved_verification_codes?.length ? (
        <div className="mt-2 pt-2 border-t border-border/60">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            未消解验证项
          </div>
          <div className="flex flex-wrap gap-1">
            {draft.unresolved_verification_codes.map((code) => (
              <Badge key={code} variant="secondary" className="text-[9px] h-4 font-mono">
                {code}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {debugUiDefaults ? (
        <div className="mt-2 pt-2 border-t border-dashed border-border/60 text-[10px] font-mono text-muted-foreground space-y-0.5">
          {draft.repair_count != null || draft.max_repair_count != null ? (
            <div>
              repair: {draft.repair_count ?? '—'} / {draft.max_repair_count ?? '—'}
            </div>
          ) : null}
          {draft.gate_status ? <div>gate_status: {draft.gate_status}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
