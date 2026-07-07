import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionSpaceOptionView } from '@/lib/decision-space-option-view.util';
import type { DecisionSpaceResultLayers } from '@/lib/decision-space-result-card.util';
import { DecisionCheckerBadge } from './decision-checker/decision-checker-ui';
import { scenarioBadgeLabel } from './decision-checker/decision-checker-ui';
import { workbenchCard } from './workbench-ui';

export interface DecisionSpaceOptionCardProps {
  option: DecisionSpaceOptionView;
  selected?: boolean;
  loading?: boolean;
  onSelect?: () => void;
}

function ResultLayerList({
  title,
  items,
  tone = 'default',
}: {
  title: string;
  items: string[];
  tone?: 'default' | 'cost';
}) {
  if (!items.length) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-medium text-muted-foreground">{title}</p>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              'text-[11px] leading-snug',
              tone === 'cost' ? 'text-gate-confirm-foreground' : 'text-foreground/90',
            )}
          >
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultCardBody({ layers }: { layers: DecisionSpaceResultLayers }) {
  return (
    <>
      <ResultLayerList title="结果" items={layers.outcomes} />
      <ResultLayerList title="代价" items={layers.costs} tone="cost" />
      <ResultLayerList title="影响范围" items={layers.impactScope} />
      {layers.systemJudgment ? (
        <p className="mt-2 rounded-md bg-muted/25 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">系统判断 · </span>
          {layers.systemJudgment}
        </p>
      ) : null}
    </>
  );
}

/** 决策执行空间 · 结果卡（非操作卡） */
export function DecisionSpaceOptionCard({
  option,
  selected,
  loading = false,
  onSelect,
}: DecisionSpaceOptionCardProps) {
  const badge = option.badgeLabel ?? scenarioBadgeLabel(option.badge);
  const layers = option.resultLayers;
  const hasResultLayers = Boolean(
    layers &&
      (layers.outcomes.length ||
        layers.costs.length ||
        layers.impactScope.length ||
        layers.systemJudgment),
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      aria-busy={loading}
      className={cn(
        'flex w-full flex-col self-start rounded-xl border p-3 text-left transition-all',
        workbenchCard,
        'border-border/70 bg-card hover:bg-muted/10',
        selected && 'ring-1 ring-inset ring-foreground/12 border-border bg-muted/15',
        loading && 'opacity-80',
      )}
    >
      <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2">
        <Circle
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            selected ? 'fill-foreground text-foreground' : 'text-muted-foreground/45',
          )}
          strokeWidth={selected ? 0 : 2}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">方案 {option.letter}</span>
            {badge ? (
              <DecisionCheckerBadge tone="neutral">{badge}</DecisionCheckerBadge>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{option.title}</p>
          {!hasResultLayers ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {option.description}
            </p>
          ) : null}
        </div>

        {hasResultLayers && layers ? (
          <div className="col-start-2">
            <ResultCardBody layers={layers} />
          </div>
        ) : (
          <>
            {option.comparison ? (
              <div className="col-start-2 mt-1.5 flex items-center gap-1.5 rounded-md bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                <span className="shrink-0">原计划 {option.comparison.before}</span>
                <span className="text-muted-foreground/60" aria-hidden>
                  ››››
                </span>
                <span className="min-w-0 font-medium text-foreground/90">
                  调整后 {option.comparison.after}
                </span>
              </div>
            ) : option.comparisonLine ? (
              <p className="col-start-2 mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {option.comparisonLine}
              </p>
            ) : null}
          </>
        )}
      </div>
    </button>
  );
}
