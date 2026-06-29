import {
  formatScorePct,
  hasAlternativesRows,
  resolveChosenAlternativeId,
  sortAlternativesForDisplay,
} from '@/lib/decision-closure-l1';
import type { RouteRunExplainOptimization } from '@/types/world-model-guards';
import { cn } from '@/lib/utils';

export interface AlternativesComparisonTableProps {
  optimization: RouteRunExplainOptimization;
  className?: string;
  defaultOpen?: boolean;
}

export function AlternativesComparisonTable({
  optimization,
  className,
  defaultOpen = false,
}: AlternativesComparisonTableProps) {
  const rows = optimization.alternatives;
  if (!hasAlternativesRows(rows) || !rows) return null;

  const chosenId = resolveChosenAlternativeId(optimization);
  const sorted = sortAlternativesForDisplay(rows);

  return (
    <details
      className={cn(
        'alternatives-comparison rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-xs',
        className
      )}
      open={defaultOpen}
    >
      <summary className="cursor-pointer font-medium text-foreground/90 select-none">
        方案得分对比（{sorted.length}）
      </summary>
      <div className="mt-2 overflow-x-auto rounded border border-border/60">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-left">
              <th scope="col" className="px-2 py-1.5 font-medium">
                方案
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                得分
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                期望效用
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                可行概率
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const isChosen = Boolean(chosenId && a.id === chosenId);
              return (
                <tr
                  key={a.id}
                  className={cn(
                    'border-b border-border/40 last:border-0',
                    isChosen && 'bg-emerald-50/60 dark:bg-emerald-950/20'
                  )}
                >
                  <td className="px-2 py-1.5 font-mono">
                    {a.id}
                    {isChosen ? ' ★' : null}
                  </td>
                  <td className="px-2 py-1.5">{formatScorePct(a.score)}</td>
                  <td className="px-2 py-1.5">{formatScorePct(a.expected_utility)}</td>
                  <td className="px-2 py-1.5">{formatScorePct(a.feasibility_probability)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
