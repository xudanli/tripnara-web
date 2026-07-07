import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { semanticGoodText, semanticWarnText } from '@/lib/semantic-ui-classes';
import { resolveDataBasisIcon } from '@/dto/frontend-planning-decision-option.util';
import type {
  DecisionProposalCardTone,
  DecisionProposalImpactScopeChips,
  DecisionProposalItemTone,
  DecisionProposalOptionView,
} from '@/lib/decision-proposal-option-view.util';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';

const TONE_STYLES: Record<
  DecisionProposalCardTone,
  { border: string; header: string; badge: string }
> = {
  recommended: {
    border: 'border-border/70',
    header: 'text-foreground',
    badge: 'border-border bg-card text-success',
  },
  neutral: {
    border: 'border-border/60',
    header: 'text-muted-foreground',
    badge: 'border-border bg-card text-muted-foreground',
  },
  risky: {
    border: 'border-border/70',
    header: 'text-foreground',
    badge: 'border-border bg-card text-error',
  },
};

const COST_TONE_CLASS: Record<DecisionProposalItemTone, string> = {
  good: 'text-foreground',
  caution: 'text-muted-foreground',
  risk: 'text-error',
  neutral: 'text-muted-foreground',
};

function LegacyImpactScopeFooter({ scope }: { scope: DecisionProposalImpactScopeChips }) {
  const lines: string[] = [];
  if (scope.timePointCount != null) lines.push(`修改 ${scope.timePointCount} 个时间点`);
  if (scope.routeSegmentCount != null) lines.push(`重算 ${scope.routeSegmentCount} 段路线`);
  if (scope.memberCount != null) lines.push(`影响 ${scope.memberCount} 名成员`);
  if (scope.skipRouteRecalc) lines.push('不重算路线');
  if (scope.highRisk) lines.push('高风险');
  lines.push(...(scope.extraLines ?? []));

  if (!lines.length) return null;

  return (
    <footer className="mt-auto border-t border-border/40 pt-2">
      <p className="mb-1 text-[10px] font-medium text-muted-foreground">影响范围</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
        {lines.map((line) => (
          <li key={line} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Minus className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </footer>
  );
}

function DataBasisFooter({ option, compact }: { option: DecisionProposalOptionView; compact?: boolean }) {
  if (option.dataBasis.length > 0) {
    return (
      <footer className="mt-auto border-t border-border/40 pt-2">
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">数据依据</p>
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
          {option.dataBasis.map((item) => {
            const Icon = resolveDataBasisIcon(item.iconKey);
            const isRisk = item.iconKey === 'risk' || item.iconKey === 'warning';
            const key = item.id ?? `${item.iconKey}-${item.label}`;
            return (
              <li
                key={key}
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] text-muted-foreground',
                  isRisk && semanticWarnText,
                )}
              >
                <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                <span className={compact ? 'line-clamp-1' : undefined}>{item.label}</span>
              </li>
            );
          })}
        </ul>
      </footer>
    );
  }

  return <LegacyImpactScopeFooter scope={option.impactScope} />;
}

export interface DecisionProposalOptionCardProps {
  option: DecisionProposalOptionView;
  selected?: boolean;
  onSelect?: (optionId: string) => void;
  compact?: boolean;
  className?: string;
}

/** 设计稿 · 方案 A/B/C 结果卡（BFF outcomeItems / costItems / dataBasis） */
export function DecisionProposalOptionCard({
  option,
  selected,
  onSelect,
  compact = false,
  className,
}: DecisionProposalOptionCardProps) {
  const tone = TONE_STYLES[option.tone];
  const interactive = Boolean(onSelect);
  const isRecommended = option.recommended || option.tone === 'recommended';

  const body = (
    <>
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('text-xs font-bold', tone.header)}>{option.badge}</span>
            {option.kindLabel ? (
              <span className="text-[10px] text-muted-foreground">{option.kindLabel}</span>
            ) : null}
          </div>
          {isRecommended ? (
            <Badge variant="outline" className={cn('h-4 shrink-0 rounded-md px-1.5 text-[10px]', tone.badge)}>
              推荐
            </Badge>
          ) : null}
        </div>
        <h3
          className={cn(
            'font-semibold leading-snug text-foreground',
            compact ? 'text-xs line-clamp-2' : 'text-[13px]',
          )}
        >
          {option.title}
        </h3>
        {option.description && !compact ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{option.description}</p>
        ) : null}
      </header>

      {option.outcomeItems.length > 0 ? (
        <section className="mt-2 space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">预计结果</p>
          <ul className="space-y-0.5">
            {option.outcomeItems.slice(0, compact ? 2 : undefined).map((item) => (
              <li key={item.id ?? item.text} className="flex items-start gap-1.5 text-[11px] leading-snug text-foreground">
                <Check className={cn('mt-0.5 h-3 w-3 shrink-0', semanticGoodText)} aria-hidden />
                <span className={compact ? 'line-clamp-2' : undefined}>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {option.costItems.length > 0 && !compact ? (
        <section className="mt-2 space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">代价</p>
          <ul className="space-y-0.5">
            {option.costItems.map((item) => (
              <li
                key={item.id ?? item.text}
                className={cn(
                  'flex items-start gap-1.5 text-[11px] leading-snug',
                  COST_TONE_CLASS[item.tone],
                )}
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!compact ? <DataBasisFooter option={option} compact={compact} /> : null}

      {option.blockedReason ? (
        <p className={cn('mt-1.5 text-[10px]', semanticWarnText)}>{option.blockedReason}</p>
      ) : null}
    </>
  );

  const cardClass = cn(
    'flex flex-col rounded-xl border bg-card text-left transition-colors',
    workbenchCard,
    'shadow-none',
    tone.border,
    compact ? 'p-2.5' : 'min-h-0 p-3',
    selected &&
      cn(
        'border-2 border-border bg-muted/15 ring-1 ring-inset ring-foreground/10',
        isRecommended && 'border-border',
      ),
    interactive && !option.disabled && 'cursor-pointer hover:bg-muted/10',
    option.disabled && 'cursor-not-allowed opacity-60',
    className,
  );

  if (!interactive) {
    return <article className={cardClass}>{body}</article>;
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={option.disabled}
      onClick={() => onSelect?.(option.id)}
      className={cardClass}
    >
      {body}
    </button>
  );
}
