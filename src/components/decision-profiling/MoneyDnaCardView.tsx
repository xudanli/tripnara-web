import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CONSUMPTION_PACE_LABELS, MONEY_DNA_AXIS_LABELS, pct } from '@/lib/decision-profiling-labels';
import { useMyMoneyDna } from '@/hooks/useDecisionProfiling';
import { MoneyDnaRadar } from './MoneyDnaRadar';
import type { MoneyDnaCard } from '@/types/trip-decision-profiling';
import { formatCurrency } from '@/utils/format';

interface MoneyDnaCardViewProps {
  tripId: string;
  card?: MoneyDnaCard | null;
  showRadar?: boolean;
}

export function MoneyDnaCardView({ tripId, card: cardProp, showRadar = true }: MoneyDnaCardViewProps) {
  const { card: fetched, loading } = useMyMoneyDna(cardProp === undefined ? tripId : null);
  const card = cardProp !== undefined ? cardProp : fetched;

  if (loading && !card) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!card) {
    return <p className="text-sm text-muted-foreground py-4">尚未完成 Money DNA 调查（仅本人可见）</p>;
  }

  return (
    <div className="space-y-3">
      {card.source === 'reused' || card.source === 'reused_edited' ? (
        <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/30 px-3 py-2 leading-relaxed">
          已沿用上次调查 · 本趟消费 DNA 已同步
        </p>
      ) : null}
      <div className={showRadar ? 'flex flex-col sm:flex-row gap-4 items-start' : 'space-y-3'}>
        {showRadar ? (
        <div className="shrink-0 mx-auto sm:mx-0">
          <MoneyDnaRadar vector={card.vector} />
        </div>
      ) : null}
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {CONSUMPTION_PACE_LABELS[card.consumptionPace]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            置信度 {Math.round(card.confidence * 100)}%
          </span>
        </div>
        {card.budgetRangeMin != null && card.budgetRangeMax != null ? (
          <p className="text-sm">
            日预算区间（不含住宿/大交通）：{' '}
            <span className="font-medium">
              {formatCurrency(card.budgetRangeMin)} – {formatCurrency(card.budgetRangeMax)}
            </span>
          </p>
        ) : null}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {Object.entries(card.vector).map(([key, val]) => (
            <li key={key} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{MONEY_DNA_AXIS_LABELS[key] ?? key}</span>
              <span className="font-medium tabular-nums">{pct(val)}%</span>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </div>
  );
}
