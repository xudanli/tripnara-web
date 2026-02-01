/**
 * 继续编辑卡片
 * 显示用户上次编辑的未完成行程，支持快速跳转到规划工作台
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, Calendar, MapPin, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TripListItem } from '@/types/trip';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type { PlanBudgetEvaluationResponse } from '@/types/trip';
import DecisionStatusIndicator, { type DecisionStatus } from './DecisionStatusIndicator';

interface ContinueEditingCardProps {
  trip: TripListItem;
  onClose?: () => void;
  getCountryName?: (code: string) => string;
  className?: string;
}

export default function ContinueEditingCard({
  trip,
  onClose,
  getCountryName,
  className,
}: ContinueEditingCardProps) {
  const navigate = useNavigate();
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus | null>(null);
  const [loadingDecision, setLoadingDecision] = useState(false);

  // 计算行程天数
  const getTripDays = (): number => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // 格式化最后编辑时间
  const formatLastEdited = (): string => {
    if (!trip.updatedAt) return '';
    const date = new Date(trip.updatedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天编辑';
    } else if (diffDays === 1) {
      return '昨天编辑';
    } else if (diffDays < 7) {
      return `${diffDays}天前编辑`;
    } else {
      return format(date, 'M月d日编辑', { locale: zhCN });
    }
  };

  // 加载决策状态
  useEffect(() => {
    loadDecisionStatus();
  }, [trip.id]);

  const loadDecisionStatus = async () => {
    try {
      setLoadingDecision(true);
      // 获取当前行程的方案列表
      const plansResponse = await planningWorkbenchApi.getTripPlans(trip.id, {
        limit: 1,
        offset: 0,
      });

      if (!plansResponse.plans || plansResponse.plans.length === 0) {
        // 没有方案，不显示决策状态
        return;
      }

      const latestPlan = plansResponse.plans[0];
      const planId = latestPlan.planId;

      // 获取预算评估结果
      try {
        const evaluation = await planningWorkbenchApi.getPlanBudgetEvaluation(planId);
        setDecisionStatus(evaluation.budgetEvaluation.verdict as DecisionStatus);
      } catch (err: any) {
        // 预算评估是可选的，静默处理
        const errorMessage = err?.message || '';
        const isNotFoundError =
          errorMessage.includes('未找到') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('不存在') ||
          err?.code === 'NOT_FOUND' ||
          err?.response?.status === 404;

        if (!isNotFoundError) {
          console.warn('[ContinueEditingCard] Failed to load decision status:', err);
        }
        // 不设置决策状态，保持为 null
      }
    } catch (err) {
      // 获取方案列表失败，静默处理，不影响卡片显示
      console.warn('[ContinueEditingCard] Failed to load plans:', err);
    } finally {
      setLoadingDecision(false);
    }
  };

  const tripDays = getTripDays();
  const countryName = getCountryName ? getCountryName(trip.destination) : trip.destination;
  const lastEdited = formatLastEdited();

  const handleContinue = () => {
    // 跳转到规划工作台
    navigate(`/dashboard/plan-studio?tripId=${trip.id}`);
  };

  const handleOpenOverview = () => {
    // 跳转到行程详情页的总览tab
    navigate(`/dashboard/trips/${trip.id}`);
  };

  return (
    <Card className={cn(
      "bg-slate-50 border-slate-200 shadow-sm",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-xl font-semibold text-gray-900">
                {countryName}
              </h2>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-gray-600"
                  onClick={onClose}
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{tripDays} 天</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{countryName}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-500">
                {lastEdited}
              </div>
              {/* 决策状态指示器 */}
              {decisionStatus && (
                <DecisionStatusIndicator status={decisionStatus} size="sm" />
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleContinue}
                className="flex items-center gap-1.5 h-9"
                size="default"
              >
                继续规划 <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                onClick={handleOpenOverview}
                variant="outline"
                className="flex items-center gap-1.5 h-9"
                size="default"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                打开总览
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
