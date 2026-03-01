/**
 * 决策结果卡片组件
 * 展示决策推荐结果，包括主方案和备选方案
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useSelectPlan, useAlternativePlan } from '@/hooks/useDecisions';
import type {
  CreateDecisionResponse,
  SelectedPlan,
  AlternativePlan,
} from '@/types/decision-engine';

interface DecisionResultCardProps {
  decision: CreateDecisionResponse;
  onPlanSelect?: (planId: string) => void;
  className?: string;
}

function PlanCard({
  plan,
  isSelected,
  isRecommended,
  onSelect,
  isLoading,
}: {
  plan: SelectedPlan;
  isSelected?: boolean;
  isRecommended?: boolean;
  onSelect?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRecommended && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              推荐
            </Badge>
          )}
          {isSelected && (
            <Badge variant="default">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              已选择
            </Badge>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {Math.round(plan.utility * 100)}
          </div>
          <div className="text-xs text-muted-foreground">综合评分</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>预计时长：{plan.totalDuration}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span>预计费用：¥{plan.estimatedCost.toLocaleString()}</span>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">效用值</span>
            <span className="font-medium">{(plan.utility * 100).toFixed(1)}%</span>
          </div>
          <Progress value={plan.utility * 100} className="h-2" />
        </div>
      </div>

      {onSelect && !isSelected && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={onSelect}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2" />
          )}
          选择此方案
        </Button>
      )}
    </div>
  );
}

function AlternativeCard({
  alternative,
  decisionId,
  onSelect,
  isSelecting,
}: {
  alternative: AlternativePlan;
  decisionId: string;
  onSelect: (planId: string) => void;
  isSelecting: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const { plan: detailedPlan, isLoading } = useAlternativePlan(
    showDetails ? decisionId : undefined,
    showDetails ? alternative.id : undefined
  );

  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-sm">{alternative.summary}</p>
          <div className="flex items-center gap-2 mt-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              效用值：{(alternative.utility * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {Math.round(alternative.utility * 100)} 分
        </Badge>
      </div>

      {showDetails && detailedPlan && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{detailedPlan.totalDuration}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>¥{detailedPlan.estimatedCost.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => setShowDetails(!showDetails)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showDetails ? (
            '收起详情'
          ) : (
            '查看详情'
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onSelect(alternative.id)}
          disabled={isSelecting}
        >
          {isSelecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            '选择'
          )}
        </Button>
      </div>
    </div>
  );
}

export function DecisionResultCard({
  decision,
  onPlanSelect,
  className,
}: DecisionResultCardProps) {
  const [selectedTab, setSelectedTab] = useState('recommended');
  const { selectPlan, isSelecting } = useSelectPlan();

  const handleSelectPlan = async (planId: string, reason?: string) => {
    try {
      await selectPlan(decision.decisionId, { planId, reason });
      onPlanSelect?.(planId);
    } catch (err) {
      console.error('Failed to select plan:', err);
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">决策结果</CardTitle>
            <CardDescription>
              置信度 {(decision.confidence * 100).toFixed(0)}% · 处理时间{' '}
              {decision.processingTime}ms
            </CardDescription>
          </div>
          <Badge
            variant={decision.status === 'completed' ? 'default' : 'secondary'}
          >
            {decision.status === 'completed' ? '已完成' : decision.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recommended">推荐方案</TabsTrigger>
            <TabsTrigger value="alternatives">
              备选方案 ({decision.alternatives.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="mt-4">
            <PlanCard
              plan={decision.selectedPlan}
              isSelected
              isRecommended
            />
          </TabsContent>

          <TabsContent value="alternatives" className="mt-4">
            {decision.alternatives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无备选方案
              </div>
            ) : (
              <div className="space-y-3">
                {decision.alternatives.map((alt) => (
                  <AlternativeCard
                    key={alt.id}
                    alternative={alt}
                    decisionId={decision.decisionId}
                    onSelect={(planId) =>
                      handleSelectPlan(planId, 'user_preference')
                    }
                    isSelecting={isSelecting}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default DecisionResultCard;
