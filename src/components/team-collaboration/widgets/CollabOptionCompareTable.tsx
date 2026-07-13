import { Progress } from '@/components/ui/progress';
import { buildNegotiationOptions } from '@/lib/collab-negotiation-stage';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundDetail } from '@/types/process-fairness';
import { workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabOptionCompareTableProps {
  task: DomainNegotiationTask;
  detail: PreferenceRoundDetail | null;
  className?: string;
  variant?: 'compact' | 'stage' | 'cards';
}

export function CollabOptionCompareTable({
  task,
  detail,
  className,
  variant = 'compact',
}: CollabOptionCompareTableProps) {
  const options = buildNegotiationOptions(detail, task);

  if (options.length === 0) return null;

  if (variant === 'cards') {
    return (
      <section className={cn('space-y-2', className)} aria-label="选项对比">
        <h4 className="text-xs font-semibold text-foreground">选项对比</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((opt) => (
            <article
              key={opt.id}
              className={cn(workbenchInsetPanel, 'bg-card p-3 shadow-sm')}
            >
              <div className="mb-2 flex items-start gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                  {opt.label}
                </span>
                <span className="text-xs font-semibold leading-snug text-foreground">{opt.title}</span>
              </div>
              <dl className="space-y-2 text-[11px]">
                <div>
                  <dt className="text-muted-foreground">核心优势</dt>
                  <dd className="mt-0.5 text-foreground">{opt.advantage}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">主要顾虑</dt>
                  <dd className="mt-0.5 text-muted-foreground">{opt.concern}</dd>
                </div>
              </dl>
              <div className="mt-2.5">
                <div className="mb-1 flex justify-between text-[10px]">
                  <span className="text-muted-foreground">支持倾向</span>
                  <span className="font-medium tabular-nums text-foreground">{opt.supportPct}%</span>
                </div>
                <Progress value={opt.supportPct} className="h-1.5" />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (variant === 'stage') {
    return (
      <section className={cn('space-y-2', className)} aria-label="备选方案">
        <h4 className="text-xs font-semibold text-foreground">备选方案 ({options.length})</h4>
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/15">
                <th className="px-3 py-2 font-medium text-muted-foreground">方案</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">核心优势</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">主要顾虑</th>
                <th className="w-28 px-3 py-2 font-medium text-muted-foreground">支持度 (预测)</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt) => (
                <tr key={opt.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                        {opt.label}
                      </span>
                      <span className="font-medium leading-snug text-foreground">{opt.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top text-foreground">{opt.advantage}</td>
                  <td className="px-3 py-2.5 align-top text-muted-foreground">{opt.concern}</td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="space-y-1">
                      <Progress value={opt.supportPct} className="h-1.5" />
                      <span className="tabular-nums text-[10px] font-medium text-foreground">
                        {opt.supportPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

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
