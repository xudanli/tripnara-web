import type { LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  decisionContextFactKindLabel,
  type DecisionContextFact,
} from '@/lib/decision-context-capsule.util';
import {
  decisionBasisFieldValueClass,
  formatDecisionBasisUpdatedAge,
  resolveDecisionBasisFieldIcon,
  type PlanningDecisionBasisContextField,
} from '@/dto/frontend-planning-decision-basis.types';

export interface DecisionBasisMetricsGridProps {
  /** BFF contextFields — 优先 */
  fields?: PlanningDecisionBasisContextField[];
  /** 客户端兜底 */
  facts?: DecisionContextFact[];
  subtitle?: string;
  dataValidUntil?: string;
  updatedAt?: string;
  optionCount?: number;
  basisLoading?: boolean;
  basisFetching?: boolean;
  basisError?: string;
  onRefreshBasis?: () => void;
  compact?: boolean;
  className?: string;
}

function BffFieldCell({ field }: { field: PlanningDecisionBasisContextField }) {
  const Icon: LucideIcon = resolveDecisionBasisFieldIcon(field.icon);
  const valueClass = decisionBasisFieldValueClass(field.tone);

  return (
    <li className="min-w-[5.5rem] flex-1 rounded-lg border border-border/50 bg-muted/10 px-2 py-2">
      <div className="flex min-w-0 items-start gap-1">
        <Icon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] leading-snug text-muted-foreground">{field.label}</p>
          <p className={cn('truncate text-[12px] font-semibold leading-snug', valueClass)}>
            {field.value}
          </p>
          {field.subtext ? (
            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{field.subtext}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function LegacyFactCell({ fact }: { fact: DecisionContextFact }) {
  return (
    <li
      className="min-w-[5.5rem] flex-1 rounded-lg border border-border/50 bg-muted/10 px-2 py-2"
      title={decisionContextFactKindLabel(fact.kind)}
    >
      {fact.label ? (
        <p className="truncate text-[10px] leading-snug text-muted-foreground">{fact.label}</p>
      ) : null}
      <p className="truncate text-[12px] font-semibold leading-snug text-foreground">{fact.text}</p>
    </li>
  );
}

/** 决策执行空间 · 「决策依据」单行指标条 */
export function DecisionBasisMetricsGrid({
  fields = [],
  facts = [],
  subtitle = '（以下因素均已纳入模型综合评估）',
  dataValidUntil,
  updatedAt,
  optionCount,
  basisLoading,
  basisFetching,
  basisError,
  onRefreshBasis,
  compact = false,
  className,
}: DecisionBasisMetricsGridProps) {
  const useBff = fields.length > 0;
  const cells = useBff ? fields : facts;

  if (basisLoading && !cells.length) {
    return (
      <section
        className={cn(
          'rounded-xl border border-border/60 bg-card/80',
          compact ? 'px-2.5 py-2' : 'px-3 py-3',
          className,
        )}
        aria-busy="true"
        aria-label="正在加载决策依据"
      >
        <div className={cn('h-3.5 w-16 animate-pulse rounded bg-muted', compact ? 'mb-1.5' : 'mb-2.5')} />
        <ul className={cn('flex gap-2', compact ? 'mt-1.5' : 'mt-2.5')}>
          {[0, 1, 2].map((index) => (
            <li
              key={index}
              className="min-w-[5.5rem] flex-1 rounded-lg border border-border/50 bg-muted/10 px-2 py-2"
            >
              <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted/80" />
              <div className="mt-1.5 h-3.5 w-full animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!cells.length) return null;

  const updatedAge = formatDecisionBasisUpdatedAge(updatedAt);

  return (
    <section className={cn('rounded-xl border border-border/60 bg-card/80', compact ? 'px-2.5 py-2' : 'px-3 py-3', className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>决策依据</p>
        {!compact && subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
      </div>

      <ul className={cn('flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', compact ? 'mt-1.5' : 'mt-2.5')}>
        {useBff
          ? fields.map((field) => <BffFieldCell key={field.id} field={field} />)
          : facts.map((fact) => <LegacyFactCell key={fact.id} fact={fact} />)}
      </ul>

      {dataValidUntil || updatedAge || optionCount != null || onRefreshBasis || basisError ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
          <p className="text-[10px] text-muted-foreground">
            {basisError ? `${basisError}` : null}
            {basisError && (dataValidUntil || updatedAge) ? ' · ' : null}
            {dataValidUntil ? `数据有效至 ${dataValidUntil}` : null}
            {dataValidUntil && updatedAge ? ' · ' : null}
            {updatedAge ?? null}
            {optionCount != null && optionCount > 0
              ? `${dataValidUntil || updatedAge ? ' · ' : ''}可选 ${optionCount} 个方案`
              : null}
          </p>
          {onRefreshBasis ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[10px]"
              disabled={basisFetching}
              onClick={() => void onRefreshBasis()}
            >
              <RefreshCw className={cn('h-3 w-3', basisFetching && 'animate-spin')} />
              刷新依据
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
