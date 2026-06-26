import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  thermometerLevelClasses,
  thermometerLevelLabel,
} from '@/lib/in-trip-execution';
import { thermometerScoreToWidth } from '@/lib/in-trip-pulse';
import type { TeamThermometerData } from '@/types/in-trip-pulse';
import type { MemberStateVector } from '@/types/in-trip-pulse';
import {
  decisionFatigueLabel,
  emotionalLevelLabel,
  physicalLevelLabel,
  socialLevelLabel,
  spendingLevelLabel,
} from '@/lib/in-trip-pulse';

interface InTripTeamThermometerPanelProps {
  thermometer: TeamThermometerData | null;
  myState?: MemberStateVector | null;
  loading?: boolean;
  className?: string;
}

export function InTripTeamThermometerPanel({
  thermometer,
  myState,
  loading,
  className,
}: InTripTeamThermometerPanelProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardContent className="py-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!thermometer) return null;

  return (
    <Card className={cn('col-span-12', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-rose-500" aria-hidden />
          团队温度计
          <Badge
            variant="outline"
            className={cn('text-[10px]', thermometerLevelClasses(thermometer.level))}
          >
            {thermometerLevelLabel(thermometer.level)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full', thermometerLevelClasses(thermometer.level))}
              style={{ width: thermometerScoreToWidth(thermometer.score) }}
            />
          </div>
          <span className="text-xs font-medium shrink-0">
            {Math.round(thermometer.score * 100)}%
          </span>
        </div>

        {thermometer.factors.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1">
            {thermometer.factors.map((f) => (
              <li key={f.key}>· {f.message}</li>
            ))}
          </ul>
        )}

        {thermometer.visible && thermometer.memberCards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {thermometer.memberCards.map((m) => (
              <Badge key={m.userId} variant="outline" className="text-xs gap-1">
                <span
                  className={cn('h-2 w-2 rounded-full', thermometerLevelClasses(m.level))}
                  aria-hidden
                />
                {m.displayName}
              </Badge>
            ))}
          </div>
        )}

        {myState && (
          <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <span>体力 · {physicalLevelLabel(myState.physicalLevel)}</span>
            <span>情绪 · {emotionalLevelLabel(myState.emotionalLevel)}</span>
            <span>消费 · {spendingLevelLabel(myState.spendingLevel)}</span>
            <span>社交 · {socialLevelLabel(myState.socialLevel)}</span>
            <span>决策 · {decisionFatigueLabel(myState.decisionFatigue)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
