/**
 * 当前行程决策卡片
 * 显示当前行程的决策状态、三人格评审结果和关键决策点
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ChevronRight, AlertCircle, Info } from 'lucide-react';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type { PlanBudgetEvaluationResponse } from '@/types/trip';
import DecisionStatusIndicator, { type DecisionStatus } from './DecisionStatusIndicator';
import PersonaStatusBadge, { type PersonaStatus } from './PersonaStatusBadge';
import { cn } from '@/lib/utils';

interface CurrentTripDecisionCardProps {
  tripId: string;
  className?: string;
}

export default function CurrentTripDecisionCard({
  tripId,
  className,
}: CurrentTripDecisionCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [budgetEvaluation, setBudgetEvaluation] = useState<PlanBudgetEvaluationResponse | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadDecisionStatus();
  }, [tripId]);

  const loadDecisionStatus = async () => {
    if (!tripId) return;

    try {
      setLoading(true);

      // 1. 获取当前行程的方案列表
      const plansResponse = await planningWorkbenchApi.getTripPlans(tripId, {
        limit: 1,
        offset: 0,
      });

      if (!plansResponse.plans || plansResponse.plans.length === 0) {
        // 没有方案，不显示决策状态
        setLoading(false);
        return;
      }

      const latestPlan = plansResponse.plans[0];
      const planId = latestPlan.planId;
      setCurrentPlanId(planId);

      // 2. 获取预算评估结果
      try {
        const evaluation = await planningWorkbenchApi.getPlanBudgetEvaluation(planId);
        setBudgetEvaluation(evaluation);
      } catch (err: any) {
        // 预算评估是可选的，如果不存在则静默处理
        const errorMessage = err?.message || '';
        const isNotFoundError =
          errorMessage.includes('未找到') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('不存在') ||
          err?.code === 'NOT_FOUND' ||
          err?.response?.status === 404;

        if (!isNotFoundError) {
          console.warn('[CurrentTripDecisionCard] Failed to load budget evaluation:', err);
        }
        // 不设置错误，因为预算评估是可选的
      }
    } catch (err: any) {
      // 获取方案列表失败，静默处理
      console.warn('[CurrentTripDecisionCard] Failed to load plans:', err);
      // 不设置错误状态，让组件不显示（返回 null）
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    if (currentPlanId) {
      navigate(`/dashboard/plan-studio?tripId=${tripId}&planId=${currentPlanId}`);
    } else {
      navigate(`/dashboard/plan-studio?tripId=${tripId}`);
    }
  };

  if (loading) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-6">
            <Spinner className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 如果没有预算评估结果，不显示卡片
  if (!budgetEvaluation || !currentPlanId) {
    return null;
  }

  const verdict = budgetEvaluation.budgetEvaluation.verdict as DecisionStatus;
  const personaOutput = budgetEvaluation.personaOutput;

  // 判断是否有需要用户确认的决策点
  const hasPendingDecisions = verdict === 'NEED_ADJUST' || verdict === 'REJECT';

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">决策状态</CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              当前行程的路线存在性判断结果
            </CardDescription>
          </div>
          <DecisionStatusIndicator status={verdict} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* 三人格评审结果 */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-slate-700">三人格评审</div>
          <div className="flex flex-wrap gap-1.5">
            {/* Abu (安全守门) */}
            {personaOutput && (
              <PersonaStatusBadge
                persona="ABU"
                status={
                  personaOutput.verdict === 'NEED_CONFIRM'
                    ? 'NEED_ADJUST'
                    : (personaOutput.verdict === 'ALLOW' || personaOutput.verdict === 'REJECT'
                        ? personaOutput.verdict
                        : 'PENDING') as PersonaStatus
                }
                size="md"
              />
            )}
            {/* Dr.Dre 和 Neptune 的状态需要从其他地方获取，这里暂时显示 PENDING */}
            <PersonaStatusBadge persona="DR_DRE" status="PENDING" size="sm" />
            <PersonaStatusBadge persona="NEPTUNE" status="PENDING" size="sm" />
          </div>
        </div>

        {/* 关键决策点 */}
        {hasPendingDecisions && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-medium text-slate-900 mb-0.5">
                  需要您的确认
                </div>
                <div className="text-xs text-slate-700">
                  {verdict === 'NEED_ADJUST'
                    ? '当前方案需要调整，请查看详情并确认调整建议。'
                    : '当前方案不符合预算约束，请查看详情并选择替代方案。'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 决策说明 */}
        {personaOutput?.explanation && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-slate-900">
                  {personaOutput.explanation}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleViewDetails}
            className="flex items-center gap-1.5 h-8"
            size="sm"
          >
            查看详情
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          {hasPendingDecisions && (
            <Button
              onClick={handleViewDetails}
              variant="outline"
              size="sm"
              className="h-8"
            >
              处理决策点
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
