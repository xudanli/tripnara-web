import {
  formatRejectedPlanStatus,
  hasRejectedPlansRows,
  humanizeRejectionReason,
  resolveChosenAlternativeId,
} from '@/lib/route-run-optimization-explain';
import type { RouteRunExplainOptimization } from '@/types/world-model-guards';
import { cn } from '@/lib/utils';

export interface RejectedPlansTableProps {
  optimization: RouteRunExplainOptimization;
  className?: string;
  defaultOpen?: boolean;
}

export function RejectedPlansTable({
  optimization,
  className,
  defaultOpen = false,
}: RejectedPlansTableProps) {
  const verdict = optimization.decision_verdict;
  const rows = verdict?.rejected_plans ?? [];
  if (!hasRejectedPlansRows(verdict)) return null;

  const chosenId = resolveChosenAlternativeId(optimization);

  return (
    <details
      className={cn(
        'rejected-plans-table rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-xs',
        className
      )}
      open={defaultOpen}
    >
      <summary className="cursor-pointer font-medium text-foreground/90 select-none">
        弃选方案（{rows.length}）
      </summary>
      <div className="mt-2 space-y-2">
        {chosenId ? (
          <p className="chosen-plan-hint text-[11px] text-muted-foreground">
            推荐方案：<code className="font-mono text-[10px]">{chosenId}</code>
          </p>
        ) : null}
        <div className="overflow-x-auto rounded border border-border/60">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left">
                <th scope="col" className="px-2 py-1.5 font-medium">
                  方案
                </th>
                <th scope="col" className="px-2 py-1.5 font-medium">
                  状态
                </th>
                <th scope="col" className="px-2 py-1.5 font-medium">
                  原因
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-1.5 font-mono">{r.id}</td>
                  <td className="px-2 py-1.5">{formatRejectedPlanStatus(r.status)}</td>
                  <td className="px-2 py-1.5 text-muted-foreground leading-snug">
                    {(r.rejection_reasons ?? []).map(humanizeRejectionReason).join('；') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
