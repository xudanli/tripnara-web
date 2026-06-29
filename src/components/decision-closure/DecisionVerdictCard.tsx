import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  formatOptimizationMethodZh,
  hasDecisionVerdictCard,
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

export interface DecisionVerdictCardProps {
  optimization?: RouteRunExplainOptimization | null;
  className?: string;
  defaultOpen?: boolean;
}

export function DecisionVerdictCard({
  optimization,
  className,
  defaultOpen = false,
}: DecisionVerdictCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const opt = optimization ?? undefined;
  const text = opt?.decision_verdict_narration_zh?.trim();
  const mc = opt?.decision_verdict?.monte_carlo_summary;
  const methodLabel = formatOptimizationMethodZh(opt?.method);

  if (!hasDecisionVerdictCard(opt) && !opt?.meta_decision_audit?.trim() && !mc?.total_samples) {
    return null;
  }

  return (
    <section className={cn('decision-verdict-card', className)} aria-label="优化决策说明">
      {text ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <ChevronRight
                  className={cn('w-3 h-3 transition-transform shrink-0', open && 'rotate-90')}
                />
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
          <CollapsibleContent className="mt-1 rounded-md border border-border/70 bg-muted/15 px-3 py-2.5 space-y-2">
            <DecisionNarrationMarkdown text={text} />
            {mc?.used && typeof mc.total_samples === 'number' && mc.total_samples > 0 ? (
              <p className="audit-muted text-[11px] text-muted-foreground">
                蒙特卡罗采样：{mc.total_samples} 次
              </p>
            ) : null}
            {opt?.meta_decision_audit ? (
              <p className="audit-muted text-[10px] font-mono text-muted-foreground/90 break-all">
                {opt.meta_decision_audit}
              </p>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="rounded-md border border-border/70 bg-muted/15 px-3 py-2.5 space-y-2">
          {mc?.used && typeof mc.total_samples === 'number' && mc.total_samples > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              蒙特卡罗采样：{mc.total_samples} 次
            </p>
          ) : null}
          {opt?.meta_decision_audit ? (
            <p className="audit-muted text-[10px] font-mono text-muted-foreground/90 break-all">
              {opt.meta_decision_audit}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
