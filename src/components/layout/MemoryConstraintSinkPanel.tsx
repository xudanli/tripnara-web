import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { MemoryContractConstraintSink } from '@/features/route-and-run/types/observability';
import type { ConstraintSinkDecisionLogEvidence } from '@/lib/extract-memory-contract';
import {
  appliedKeyLabelZh,
  MEMORY_CONSOLE_UI_DEFAULT_ZH,
} from '@/contracts/memory-console-ui-state.v1';
import { isMemoryConsoleEnabled } from '@/lib/memory-feature';
import { cn } from '@/lib/utils';

type MemoryConstraintSinkPanelProps = {
  sink?: MemoryContractConstraintSink | null;
  decisionLogEvidence?: ConstraintSinkDecisionLogEvidence | null;
  highlightPatchId?: string;
  tripId?: string | null;
};

function PatchIdList({
  patchIds,
  label,
  sourceHint,
  highlightPatchId,
  tripId,
}: {
  patchIds: string[];
  label: string;
  sourceHint?: string;
  highlightPatchId?: string;
  tripId?: string | null;
}) {
  if (patchIds.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{label}</h3>
        {sourceHint ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {sourceHint}
          </Badge>
        ) : null}
      </div>
      <ul className="space-y-2">
        {patchIds.map((id) => (
          <li
            key={`${label}-${id}`}
            className={cn(
              'rounded border px-2 py-1.5 font-mono text-xs',
              highlightPatchId === id && 'border-primary bg-primary/5'
            )}
          >
            {id}
            {isMemoryConsoleEnabled() && tripId ? (
              <Button variant="link" size="sm" className="ml-2 h-auto p-0 text-xs" asChild>
                <Link to={`/dashboard/settings/memory?trip_id=${encodeURIComponent(tripId)}`}>
                  在 Console 管理
                </Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MemoryConstraintSinkPanel({
  sink,
  decisionLogEvidence,
  highlightPatchId,
  tripId,
}: MemoryConstraintSinkPanelProps) {
  const obsPatchIds = sink?.patch_ids ?? [];
  const dlPatchIds = decisionLogEvidence?.patch_ids ?? [];
  const obsOnlyPatchIds = obsPatchIds.filter((id) => !dlPatchIds.includes(id));
  const dlOnlyPatchIds = dlPatchIds.filter((id) => !obsPatchIds.includes(id));
  const sharedPatchIds = obsPatchIds.filter((id) => dlPatchIds.includes(id));

  const appliedKeys = [
    ...new Set([...(sink?.applied_keys ?? []), ...(decisionLogEvidence?.applied_keys ?? [])]),
  ];
  const overridden = sink?.overridden_by_request_keys ?? [];
  const hasAny =
    sink?.hydrated ||
    appliedKeys.length > 0 ||
    obsPatchIds.length > 0 ||
    dlPatchIds.length > 0 ||
    overridden.length > 0;

  if (!hasAny) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        本次规划未注入记忆约束
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground leading-relaxed">
        合规展示：仅 id/hash，不含对话原文。observability 与 decision_log 交叉对照。
      </p>

      {decisionLogEvidence?.outputs_summary ? (
        <section className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs">
          <p className="font-medium text-foreground/90">decision_log 摘要</p>
          <p className="mt-1 font-mono text-muted-foreground break-all">
            {decisionLogEvidence.outputs_summary}
          </p>
          {decisionLogEvidence.step ? (
            <p className="mt-1 text-muted-foreground">step: {decisionLogEvidence.step}</p>
          ) : null}
        </section>
      ) : null}

      {appliedKeys.length > 0 ? (
        <section>
          <h3 className="mb-2 font-medium">已应用键</h3>
          <div className="flex flex-wrap gap-1.5">
            {appliedKeys.map((k) => (
              <Badge key={k} variant="secondary">
                {appliedKeyLabelZh(k)}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {sharedPatchIds.length > 0 ? (
        <PatchIdList
          patchIds={sharedPatchIds}
          label="Patch ID（observability ∩ decision_log）"
          highlightPatchId={highlightPatchId}
          tripId={tripId}
        />
      ) : null}

      <PatchIdList
        patchIds={obsOnlyPatchIds}
        label="Patch ID（observability）"
        sourceHint="memory_contract.constraint_sink"
        highlightPatchId={highlightPatchId}
        tripId={tripId}
      />

      <PatchIdList
        patchIds={dlOnlyPatchIds}
        label="Patch ID（decision_log）"
        sourceHint="metadata.constraint_sink_patch_ids"
        highlightPatchId={highlightPatchId}
        tripId={tripId}
      />

      {overridden.length > 0 ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          <p className="font-medium">{MEMORY_CONSOLE_UI_DEFAULT_ZH.gate_sink_override_hint}</p>
          <p className="mt-1 text-xs">{overridden.map(appliedKeyLabelZh).join('、')}</p>
        </section>
      ) : null}
    </div>
  );
}
