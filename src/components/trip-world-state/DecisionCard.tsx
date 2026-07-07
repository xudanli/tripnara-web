import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { workbenchPreDeparturePriorityBadgeClass } from '@/components/plan-studio/workbench/workbench-ui';
import type { DecisionQueueItem, DecisionQueueSeverity } from '@/api/travel-status.types';
import { travelStatusListItem } from '@/components/travel-status/travel-status-ui';

const SEVERITY_META: Record<
  DecisionQueueSeverity,
  { label: string; priority: 'high' | 'medium' | 'low' }
> = {
  BLOCK: { label: '必须处理', priority: 'high' },
  CONFLICT: { label: '有冲突', priority: 'high' },
  VERIFY: { label: '待确认', priority: 'medium' },
  OPTIMIZE: { label: '可优化', priority: 'low' },
};

export interface DecisionCardProps {
  item: DecisionQueueItem;
  onAcceptRecommended: (problemId: string) => Promise<void>;
  onViewAlternatives?: (problemId: string) => void;
  onKeepOriginal?: (problemId: string, action: DecisionQueueItem['actions']['keepOriginal']) => void;
  onDefer?: (problemId: string, action: DecisionQueueItem['actions']['defer']) => void;
  acceptingProblemId?: string | null;
  submittingAction?: {
    problemId: string;
    kind: 'keepOriginal' | 'defer';
  } | null;
  className?: string;
}

/** 统一决策卡：问题 → 影响 → 依据 → 选项 → 执行状态 */
export function DecisionCard({
  item,
  onAcceptRecommended,
  onViewAlternatives,
  onKeepOriginal,
  onDefer,
  acceptingProblemId,
  submittingAction,
  className,
}: DecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = SEVERITY_META[item.severity] ?? SEVERITY_META.VERIFY;
  const isAccepting = acceptingProblemId === item.problemId;
  const isKeepingOriginal =
    submittingAction?.problemId === item.problemId && submittingAction.kind === 'keepOriginal';
  const isDeferring =
    submittingAction?.problemId === item.problemId && submittingAction.kind === 'defer';
  const canAccept = item.actions.acceptRecommended?.enabled !== false;

  return (
    <article className={cn(travelStatusListItem, 'p-0', className)}>
      <div className="space-y-3 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={workbenchPreDeparturePriorityBadgeClass(meta.priority)}>{meta.label}</span>
          {item.affectedDayNumbers?.length ? (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              第 {item.affectedDayNumbers.join('、')} 天
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold leading-snug text-foreground">{item.headline}</h3>
          {item.impact ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.impact}</p>
          ) : null}
        </div>

        {item.recommendation?.title ? (
          <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">推荐方案</p>
            <p className="mt-1 text-xs font-semibold text-foreground">{item.recommendation.title}</p>
            {item.recommendation.summary ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.recommendation.summary}
              </p>
            ) : null}
            {(item.recommendation.keeps?.length || item.recommendation.costs?.length) ? (
              <div className="mt-2.5 grid gap-2 border-t border-border/40 pt-2.5 sm:grid-cols-2">
                {item.recommendation.keeps?.length ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      保留
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-foreground/90">
                      {(item.recommendation.keeps ?? []).map((k) => (
                        <li key={k}>· {k}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {item.recommendation.costs?.length ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      代价
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-foreground/90">
                      {(item.recommendation.costs ?? []).map((c) => (
                        <li key={c}>· {c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="h-8"
            disabled={!canAccept || isAccepting}
            onClick={() => onAcceptRecommended(item.problemId)}
          >
            {isAccepting ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
            接受推荐
          </Button>
          {item.actions.viewAlternatives?.enabled ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => onViewAlternatives?.(item.problemId)}
            >
              其他方案
            </Button>
          ) : null}
          {item.actions.keepOriginal?.enabled ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              disabled={isKeepingOriginal || isAccepting}
              onClick={() => onKeepOriginal?.(item.problemId, item.actions.keepOriginal)}
            >
              {isKeepingOriginal ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
              保留原计划
            </Button>
          ) : null}
          {item.actions.defer?.enabled ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              disabled={isDeferring || isAccepting}
              onClick={() => onDefer?.(item.problemId, item.actions.defer)}
            >
              {isDeferring ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
              稍后决定
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '收起' : '详情'}
          </Button>
        </div>

        {expanded ? (
          <p className="text-[10px] text-muted-foreground">
            问题 ID · <span className="font-mono">{item.problemId}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export { SEVERITY_META as decisionCardSeverityMeta };
