import { Progress } from '@/components/ui/progress';
import { buildNegotiationOptions } from '@/lib/collab-negotiation-stage';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundDetail } from '@/types/process-fairness';
import { cn } from '@/lib/utils';

interface CollabOptionCompareTableProps {
  task: DomainNegotiationTask;
  detail: PreferenceRoundDetail | null;
  className?: string;
}

export function CollabOptionCompareTable({
  task,
  detail,
  className,
}: CollabOptionCompareTableProps) {
  const options = buildNegotiationOptions(detail, task);

  if (options.length === 0) return null;

  return (
    <section className={cn('space-y-2', className)} aria-label="选项对比">
      <h4 className="text-xs font-semibold text-foreground">选项对比</h4>
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              <th className="px-3 py-2 font-medium text-muted-foreground">维度</th>
              {options.map((opt) => (
                <th key={opt.id} className="px-3 py-2 font-semibold text-foreground">
                  方案 {opt.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/40">
              <td className="px-3 py-2 text-muted-foreground">概要</td>
              {options.map((opt) => (
                <td key={opt.id} className="px-3 py-2 font-medium">
                  {opt.title}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/40">
              <td className="px-3 py-2 text-muted-foreground">核心优势</td>
              {options.map((opt) => (
                <td key={opt.id} className="px-3 py-2 text-foreground">
                  {opt.advantage}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/40">
              <td className="px-3 py-2 text-muted-foreground">主要顾虑</td>
              {options.map((opt) => (
                <td key={opt.id} className="px-3 py-2 text-muted-foreground">
                  {opt.concern}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">支持率</td>
              {options.map((opt) => (
                <td key={opt.id} className="px-3 py-2">
                  <div className="space-y-1">
                    <Progress value={opt.supportPct} className="h-1.5" />
                    <span className="tabular-nums text-[10px] text-muted-foreground">
                      {opt.supportPct}%
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
