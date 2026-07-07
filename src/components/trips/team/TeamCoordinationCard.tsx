import { ArrowRight, CheckCircle2, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamNegotiationResultCard } from '@/components/optimization';
import type { TeamConflictItem } from '@/lib/team-tab-model';
import type { TeamNegotiationResponse } from '@/types/optimization-v2';

interface TeamCoordinationCardProps {
  memberCount: number;
  conflicts: TeamConflictItem[];
  hasPlan: boolean;
  negotiating?: boolean;
  negotiationResult: TeamNegotiationResponse | null;
  tripId: string;
  userId?: string | null;
  onStartCoordination: () => void;
  onGoToPlan?: () => void;
}

export default function TeamCoordinationCard({
  memberCount,
  conflicts,
  hasPlan,
  negotiating = false,
  negotiationResult,
  tripId,
  userId,
  onStartCoordination,
  onGoToPlan,
}: TeamCoordinationCardProps) {
  const isSolo = memberCount <= 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">大家对行程合拍吗？</CardTitle>
        <CardDescription className="text-sm">
          {isSolo
            ? '只有您一人时无需对齐，直接去时间轴改行程即可'
            : '系统会比对体力、预算等偏好，找出可能需要商量的地方'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSolo ? (
          <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-gate-allow-foreground shrink-0 mt-0.5" />
            <div className="space-y-2 min-w-0">
              <p className="text-sm font-medium">单人行程，您说了算</p>
              {onGoToPlan ? (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={onGoToPlan}>
                  去时间轴
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {conflicts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">可能需要商量</p>
                <ul className="space-y-2">
                  {conflicts.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <GitCompare className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{item.topic}</span>
                        <span className="text-muted-foreground"> · {item.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted/30 px-3 py-2">
                暂未发现明显冲突。您也可以主动检查一下，确认大家都接受当前方案。
              </p>
            )}

            <Button
              onClick={onStartCoordination}
              disabled={negotiating || !hasPlan || memberCount < 1}
              className="gap-2"
              variant="outline"
            >
              {negotiating ? '检查中…' : '检查是否合拍'}
            </Button>
            {!hasPlan ? (
              <p className="text-xs text-muted-foreground">请先在时间轴生成日程后再检查</p>
            ) : null}
          </>
        )}

        {negotiationResult ? (
          <TeamNegotiationResultCard
            result={negotiationResult}
            tripId={tripId}
            userId={userId}
            onGoToPlan={onGoToPlan}
            embedded
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
