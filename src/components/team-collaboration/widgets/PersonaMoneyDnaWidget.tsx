import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyMoneyDna } from '@/hooks/useDecisionProfiling';
import { MoneyDnaRadar } from '@/components/decision-profiling/MoneyDnaRadar';
import { pct } from '@/lib/decision-profiling-labels';
import type { MoneyDnaVector, TeamMoneyDnaItem } from '@/types/trip-decision-profiling';
import { CollabWidgetCard } from './CollabWidgetCard';

interface PersonaMoneyDnaWidgetProps {
  tripId: string;
  teamMoneyDna?: TeamMoneyDnaItem[];
  frictionCoefficientPct?: number;
}

const AXIS_KEYS: (keyof MoneyDnaVector)[] = [
  'experienceTendency',
  'qualityTendency',
  'timeValueTendency',
  'socialScarcityTendency',
];

function averageVector(vectors: MoneyDnaVector[]): MoneyDnaVector | null {
  if (vectors.length === 0) return null;
  const sum: MoneyDnaVector = {
    experienceTendency: 0,
    qualityTendency: 0,
    timeValueTendency: 0,
    socialScarcityTendency: 0,
  };
  for (const v of vectors) {
    for (const key of AXIS_KEYS) {
      sum[key] += v[key];
    }
  }
  const n = vectors.length;
  return {
    experienceTendency: sum.experienceTendency / n,
    qualityTendency: sum.qualityTendency / n,
    timeValueTendency: sum.timeValueTendency / n,
    socialScarcityTendency: sum.socialScarcityTendency / n,
  };
}

export function PersonaMoneyDnaWidget({
  tripId,
  teamMoneyDna = [],
  frictionCoefficientPct,
}: PersonaMoneyDnaWidgetProps) {
  const { card, loading } = useMyMoneyDna(tripId);

  const memberVectors = teamMoneyDna
    .map((m) => m.vector)
    .filter((v): v is MoneyDnaVector => Boolean(v));
  const teamAverage =
    averageVector(memberVectors) ?? card?.vector ?? null;

  const barMembers =
    memberVectors.length > 0
      ? teamMoneyDna.filter((m) => m.vector)
      : teamMoneyDna;

  return (
    <CollabWidgetCard
      title="Money DNA"
      description="团队消费分布"
      action={
        <Button type="button" variant="link" className="h-auto p-0 text-[10px] text-primary">
          查看 Money DNA 详情
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      }
    >
      {loading && !teamAverage ? (
        <p className="text-xs text-muted-foreground">加载中…</p>
      ) : !teamAverage ? (
        <p className="text-xs text-muted-foreground">完成 Money DNA 调查后显示雷达与成员对比。</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
            <MoneyDnaRadar vector={teamAverage} size={140} />
            <div className="min-w-0 flex-1 space-y-1 text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground">团队整体分布</p>
              <p>团队平均</p>
              {frictionCoefficientPct != null ? (
                <p>
                  摩擦系数{' '}
                  <span className="font-semibold tabular-nums text-foreground">
                    {frictionCoefficientPct}%
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          {barMembers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground">成员倾向对比</p>
              {barMembers.slice(0, 4).map((member) => {
                const primaryAxis = member.vector
                  ? Math.max(
                      ...AXIS_KEYS.map((key) => pct(member.vector![key])),
                    )
                  : member.styleSimilarityPct;

                return (
                  <div key={member.userId} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="truncate text-foreground">{member.displayName}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {primaryAxis}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.min(100, primaryAxis)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </CollabWidgetCard>
  );
}
