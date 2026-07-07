import { MoneyDnaRadar } from '@/components/decision-profiling/MoneyDnaRadar';
import { personaSectionMinHeight } from '@/components/team-collaboration/persona-ui';
import { useMyMoneyDna } from '@/hooks/useDecisionProfiling';
import { MONEY_DNA_AXIS_LABELS, pct } from '@/lib/decision-profiling-labels';
import {
  averageMoneyDnaVector,
  MONEY_DNA_AXIS_KEYS,
} from '@/lib/persona-money-dna';
import type { MoneyDnaVector, TeamMoneyDnaItem } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface PersonaMoneyDnaWidgetProps {
  tripId: string;
  teamMoneyDna?: TeamMoneyDnaItem[];
}

export function PersonaMoneyDnaWidget({
  tripId,
  teamMoneyDna = [],
}: PersonaMoneyDnaWidgetProps) {
  const { card, loading } = useMyMoneyDna(tripId);

  const memberVectors = teamMoneyDna
    .map((member) => member.vector)
    .filter((vector): vector is MoneyDnaVector => Boolean(vector));
  const teamAverage = averageMoneyDnaVector(memberVectors) ?? card?.vector ?? null;

  return (
    <CollabWidgetCard title="Money DNA · 团队消费分布" className={cn('h-full', personaSectionMinHeight)}>
      {loading && !teamAverage ? (
        <p className="text-xs text-muted-foreground">加载中…</p>
      ) : !teamAverage ? (
        <p className="text-xs text-muted-foreground">完成 Money DNA 调查后显示团队分布。</p>
      ) : (
        <div className="flex items-center gap-1">
          <div className="shrink-0">
            <MoneyDnaRadar vector={teamAverage} size={128} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[10px] font-medium text-foreground">团队整体分布</p>
            <ul className="space-y-1.5">
              {MONEY_DNA_AXIS_KEYS.map((key) => (
                <li key={key} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="truncate text-muted-foreground">{MONEY_DNA_AXIS_LABELS[key]}</span>
                  <span className="shrink-0 tabular-nums font-semibold text-foreground">
                    {pct(teamAverage[key])}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </CollabWidgetCard>
  );
}
