import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import {
  useGate1AdvisorOutputs,
  useSubmitPlanBOutcome,
  useSubmitPlanBPreDecision,
} from '@/hooks/useGate1';
import { gate1PlanBPreDecisionLabel } from '@/lib/gate1-display';
import { Gate1HumanAssistedBadge } from './Gate1HumanAssistedBadge';
import type { Gate1PlanBAdvisorPreDecision } from '@/types/gate1';

interface Gate1PlanBPanelProps {
  projectId: string;
  baselineReady: boolean;
}

export function Gate1PlanBPanel({ projectId, baselineReady }: Gate1PlanBPanelProps) {
  const { data, isLoading, isError, error } = useGate1AdvisorOutputs(projectId);
  const preDecision = useSubmitPlanBPreDecision(projectId);
  const planBOutcome = useSubmitPlanBOutcome(projectId);

  const [preReasons, setPreReasons] = useState<Record<string, string>>({});
  const [outcomeSummaries, setOutcomeSummaries] = useState<Record<string, string>>({});

  if (!baselineReady) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          完成 Baseline 后，运营发布的高影响 Plan B 将在此展示。
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LogoLoading size={32} />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : '加载失败'}
        </CardContent>
      </Card>
    );
  }

  const planBs = data?.planB?.filter((p) => p.status === 'PUBLISHED') ?? [];

  if (planBs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          暂无已发布 Plan B。仅针对有事实依据的高影响风险创建，不强制凑数量。
        </CardContent>
      </Card>
    );
  }

  const handlePreDecision = async (planBId: string, decision: Gate1PlanBAdvisorPreDecision) => {
    try {
      await preDecision.mutateAsync({
        planBId,
        body: {
          decision,
          reason: preReasons[planBId]?.trim() || undefined,
        },
      });
      toast.success('预先决策已记录');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败');
    }
  };

  const handleOutcome = async (
    planBId: string,
    triggered: boolean,
    adopted: boolean,
  ) => {
    try {
      await planBOutcome.mutateAsync({
        planBId,
        body: {
          triggered,
          adopted,
          outcomeSummary: outcomeSummaries[planBId]?.trim() || undefined,
        },
      });
      toast.success('Plan B 执行结果已记录');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '记录失败');
    }
  };

  return (
    <div className="space-y-4">
      {planBs.map((plan) => (
        <Card key={plan.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {plan.label}
              <Gate1HumanAssistedBadge
                sourceType={plan.sourceType}
                humanAssistedLabel={plan.humanAssistedLabel}
              />
              {plan.advisorPreDecision && (
                <Badge variant="outline">
                  {gate1PlanBPreDecisionLabel(plan.advisorPreDecision)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{plan.riskTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 rounded-lg bg-muted/40 p-3">
              <p>
                <span className="text-muted-foreground">触发条件：</span>
                {plan.triggerCondition}
              </p>
              {plan.latestDecisionAt && (
                <p>
                  <span className="text-muted-foreground">最晚决策：</span>
                  {new Date(plan.latestDecisionAt).toLocaleString()}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">替代方案：</span>
                {plan.alternativeSummary}
              </p>
              {plan.costSummary && (
                <p>
                  <span className="text-muted-foreground">成本：</span>
                  {plan.costSummary}
                </p>
              )}
              {plan.impactSummary && (
                <p>
                  <span className="text-muted-foreground">影响：</span>
                  {plan.impactSummary}
                </p>
              )}
            </div>

            {(plan.triggered != null || plan.adopted != null) && (
              <p className="text-muted-foreground">
                行中记录：触发 {plan.triggered ? '是' : '否'} · 采用 {plan.adopted ? '是' : '否'}
              </p>
            )}

            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs text-muted-foreground">行前预先决策</Label>
              <Input
                placeholder="原因（可选）"
                value={preReasons[plan.id] ?? ''}
                onChange={(e) =>
                  setPreReasons((prev) => ({ ...prev, [plan.id]: e.target.value }))
                }
              />
              <div className="flex flex-wrap gap-2">
                {(['ACCEPTED', 'REJECTED', 'PENDING'] as Gate1PlanBAdvisorPreDecision[]).map(
                  (d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant="outline"
                      disabled={preDecision.isPending}
                      onClick={() => void handlePreDecision(plan.id, d)}
                    >
                      {gate1PlanBPreDecisionLabel(d)}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs text-muted-foreground">行中 / 复盘结果</Label>
              <Textarea
                rows={2}
                placeholder="实际结果摘要"
                value={outcomeSummaries[plan.id] ?? ''}
                onChange={(e) =>
                  setOutcomeSummaries((prev) => ({ ...prev, [plan.id]: e.target.value }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={planBOutcome.isPending}
                  onClick={() => void handleOutcome(plan.id, true, true)}
                >
                  已触发且采用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={planBOutcome.isPending}
                  onClick={() => void handleOutcome(plan.id, true, false)}
                >
                  已触发未采用
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={planBOutcome.isPending}
                  onClick={() => void handleOutcome(plan.id, false, false)}
                >
                  未触发
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
