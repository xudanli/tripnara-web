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
        <CardTitle className="text-base">协调与冲突</CardTitle>
        <CardDescription className="text-sm">
          {isSolo ? '单人行程无需协调，可直接进入规划' : '发现分歧时，发起协调流程生成共识方案'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSolo ? (
          <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-2 min-w-0">
              <p className="text-sm font-medium">无需协调（单人决策）</p>
              <p className="text-xs text-muted-foreground">
                添加更多成员后，系统会自动识别偏好分歧并引导协调。
              </p>
              {onGoToPlan ? (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={onGoToPlan}>
                  去规划行程
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {conflicts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  分歧项
                </p>
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
                暂未检测到明显分歧，可直接规划或发起协调以验证共识。
              </p>
            )}

            <Button
              onClick={onStartCoordination}
              disabled={negotiating || !hasPlan || memberCount < 1}
              className="gap-2"
            >
              {negotiating ? '协调中…' : '发起协调流程'}
            </Button>
            {!hasPlan ? (
              <p className="text-xs text-muted-foreground">请先在时间轴生成行程后再协调</p>
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
