import { MoneyDnaRadar } from '@/components/decision-profiling/MoneyDnaRadar';
import { useMyMoneyDna } from '@/hooks/useDecisionProfiling';
import { MONEY_DNA_AXIS_LABELS, pct } from '@/lib/decision-profiling-labels';
import {
  averageMoneyDnaVector,
  MONEY_DNA_AXIS_KEYS,
} from '@/lib/persona-money-dna';
import type { MoneyDnaVector, TeamMoneyDnaItem } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface PersonaMoneyDnaCompareWidgetProps {
  tripId: string;
  teamMoneyDna?: TeamMoneyDnaItem[];
  className?: string;
}

export function PersonaMoneyDnaCompareWidget({
  tripId,
  teamMoneyDna = [],
  className,
}: PersonaMoneyDnaCompareWidgetProps) {
  const { card, loading } = useMyMoneyDna(tripId);

  const memberVectors = teamMoneyDna
    .map((member) => member.vector)
    .filter((vector): vector is MoneyDnaVector => Boolean(vector));
  const teamAverage = averageMoneyDnaVector(memberVectors) ?? card?.vector ?? null;
  const membersWithVector = teamMoneyDna.filter((member) => member.vector);

  return (
    <CollabWidgetCard title="Money DNA · 雷达与成员对比" compact className={className}>
      {loading && !teamAverage ? (
        <p className="text-xs text-muted-foreground">加载中…</p>
      ) : !teamAverage ? (
        <p className="text-xs text-muted-foreground">完成 Money DNA 调查后显示团队分布。</p>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="shrink-0 self-center sm:self-start">
              <MoneyDnaRadar vector={teamAverage} size={140} />
              <p className="mt-1 text-center text-[10px] text-muted-foreground">团队均值</p>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <table className="w-full min-w-[280px] text-[10px]">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="pb-2 pr-2 text-left font-medium">成员</th>
                    {MONEY_DNA_AXIS_KEYS.map((key) => (
                      <th key={key} className="px-1 pb-2 text-center font-medium">
                        {MONEY_DNA_AXIS_LABELS[key]?.slice(0, 4)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {membersWithVector.map((member) => (
                    <tr key={member.userId} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 pr-2 font-medium text-foreground">{member.displayName}</td>
                      {MONEY_DNA_AXIS_KEYS.map((key) => (
                        <td key={key} className="px-1 py-1.5 text-center tabular-nums text-muted-foreground">
                          {member.vector ? pct(member.vector[key]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cn('rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground')}>
            <p className="font-medium text-foreground">解读说明</p>
            <p className="mt-1">
              雷达图展示团队 Money DNA 均值；表格对比各成员在体验倾向、品质要求、时间价值与社交稀缺性上的差异，供协商预算与节奏时参考。
            </p>
          </div>
        </div>
      )}
    </CollabWidgetCard>
  );
}
