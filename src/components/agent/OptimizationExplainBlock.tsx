/**
 * L1：decision_verdict_narration_zh 折叠 Markdown + audit / MC 一行
 * L2：decision_verdict.rejected_plans 表格（tier="L2"）
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatOptimizationMethodZh,
  hasOptimizationDecisionUi,
  humanizeRejectionReason,
  shouldShowRejectedPlansTable,
} from '@/lib/route-run-optimization-explain';
import type { RouteRunExplainOptimization } from '@/types/world-model-guards';
import { cn } from '@/lib/utils';
import { ChevronRight, Scale } from 'lucide-react';

function DecisionNarrationMarkdown({ text }: { text: string }) {
  return (
    <div
      className="agent-markdown min-w-0 break-words [overflow-wrap:anywhere] text-[12px] leading-relaxed text-foreground/95"
      aria-label="优化决策说明"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed break-words [overflow-wrap:anywhere]">{children}</p>
          ),
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-4">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded bg-muted/80 px-1 py-0.5 font-mono text-[11px]">{children}</code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function statusLabelZh(status: string | undefined): string {
  switch (status) {
    case 'infeasible':
      return '不可行';
    case 'rejected':
      return '未选用';
    case 'chosen':
      return '已选用';
    case 'dominated':
      return '被支配';
    case 'filtered':
      return '已过滤';
    default:
      return status ?? '未选用';
  }
}

export interface OptimizationExplainBlockProps {
  optimization?: RouteRunExplainOptimization | null;
  className?: string;
  defaultOpen?: boolean;
  /** L1：仅判决书 + audit/MC；L2：再加弃选表 */
  tier?: 'L1' | 'L2';
}

export function OptimizationExplainBlock({
  optimization,
  className,
  defaultOpen = false,
  tier = 'L1',
}: OptimizationExplainBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!hasOptimizationDecisionUi(optimization ?? undefined)) return null;

  const narration = optimization?.decision_verdict_narration_zh?.trim();
  const verdict = optimization?.decision_verdict;
  const chosen = verdict?.chosen_plan_id ?? optimization?.recommended_alternative_id;
  const rejected = verdict?.rejected_plans ?? [];
  const mc = verdict?.monte_carlo_summary;
  const methodLabel = formatOptimizationMethodZh(optimization?.method);
  const showTable = tier === 'L2' && shouldShowRejectedPlansTable(optimization ?? undefined);

  return (
    <section className={cn('decision-verdict-card', className)} aria-label="优化决策说明">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <ChevronRight className={cn('w-3 h-3 transition-transform shrink-0', open && 'rotate-90')} />
              <Scale className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate font-medium">优化决策说明</span>
              {methodLabel ? (
                <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                  {methodLabel}
                </Badge>
              ) : null}
            </span>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-1 rounded-md border border-border/70 bg-muted/15 px-3 py-2.5 space-y-3">
          {narration ? <DecisionNarrationMarkdown text={narration} /> : null}

          {mc?.used && typeof mc.total_samples === 'number' && mc.total_samples > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              后台约 {mc.total_samples} 次抽样后推荐当前方案。
            </p>
          ) : null}

          {optimization?.meta_decision_audit ? (
            <p className="audit-muted text-[10px] font-mono text-muted-foreground/90 break-all">
              {optimization.meta_decision_audit}
            </p>
          ) : null}

          {showTable ? (
            <div className="rounded-md border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8 text-[10px]">方案</TableHead>
                    <TableHead className="h-8 text-[10px]">状态</TableHead>
                    <TableHead className="h-8 text-[10px]">原因</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chosen ? (
                    <TableRow className="bg-gate-allow/50 dark:bg-gate-allow/20">
                      <TableCell className="py-2 text-[11px] font-medium">{chosen}</TableCell>
                      <TableCell className="py-2">
                        <Badge className="text-[10px] bg-gate-allow-foreground hover:bg-gate-allow-foreground">已选用</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-[11px] text-muted-foreground">—</TableCell>
                    </TableRow>
                  ) : null}
                  {rejected.map((p) => {
                    const infeasible = (p.status ?? '').toLowerCase() === 'infeasible';
                    const reasons = (p.rejection_reasons ?? []).map(humanizeRejectionReason).join('；');
                    return (
                      <TableRow
                        key={p.id}
                        className={cn(infeasible && 'bg-gate-reject/40 dark:bg-gate-reject/15')}
                      >
                        <TableCell className="py-2 text-[11px] font-medium">{p.id}</TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              infeasible
                                ? 'border-gate-reject-border text-gate-reject-foreground bg-gate-reject'
                                : 'text-muted-foreground'
                            )}
                          >
                            {statusLabelZh(p.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-[11px] text-muted-foreground leading-snug">
                          {reasons || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {!narration && !showTable && !optimization?.meta_decision_audit && !mc?.total_samples ? (
            <p className="text-[11px] text-muted-foreground">暂无优化决策说明。</p>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
