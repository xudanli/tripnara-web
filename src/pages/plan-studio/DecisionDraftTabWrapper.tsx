/**
 * 决策草案标签页包装组件
 * 从规划工作台获取 planState，提取 decision_draft_id
 */

import { useState, useEffect } from 'react';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import DecisionDraftTab from './DecisionDraftTab';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';

interface DecisionDraftTabWrapperProps {
  tripId: string;
}

export default function DecisionDraftTabWrapper({ tripId }: DecisionDraftTabWrapperProps) {
  const [planId, setPlanId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentPlan();
  }, [tripId]);

  const loadCurrentPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取当前方案列表
      const plansResponse = await planningWorkbenchApi.getTripPlans(tripId);
      
      if (plansResponse.plans && plansResponse.plans.length > 0) {
        // 使用最新的方案
        const latestPlan = plansResponse.plans[0];
        const currentPlanId = latestPlan.planId;
        setPlanId(currentPlanId);

        // 尝试获取方案状态，从中提取 decision_draft_id
        try {
          const planState = await planningWorkbenchApi.getState(currentPlanId);
          
          // 如果 planState 中有 decision_draft_id，使用它
          // 注意：decision_draft_id 只在自然语言创建流程中生成
          const draftIdFromState = (planState as any).decision_draft_id;
          if (draftIdFromState) {
            setDraftId(draftIdFromState);
          } else {
            // 如果没有 decision_draft_id，说明这不是自然语言创建的行程
            // 不设置 draftId，让组件显示提示信息
            setDraftId(null);
          }
        } catch (stateErr: any) {
          // 如果获取状态失败，说明可能不是自然语言创建的行程
          console.warn('Failed to get plan state:', stateErr);
          setDraftId(null);
        }
      } else {
        setError('当前行程暂无方案，请先生成方案');
      }
    } catch (err: any) {
      console.error('Failed to load current plan:', err);
      setError(err.message || '加载方案失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            请先在"规划工作台"标签页生成方案
          </p>
        </div>
      </Card>
    );
  }

  if (!draftId) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            当前方案暂无决策草案
          </p>
          <p className="text-sm text-muted-foreground">
            决策可视化功能仅适用于通过自然语言创建的行程。只有自然语言创建的行程才会生成决策草案，记录AI的决策过程。
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            提示：如果您想查看决策过程，请使用"自然语言创建"方式创建行程。
          </p>
        </div>
      </Card>
    );
  }

  return (
    <DecisionDraftTab
      draftId={draftId}
      planId={planId || undefined}
      tripId={tripId}
    />
  );
}
