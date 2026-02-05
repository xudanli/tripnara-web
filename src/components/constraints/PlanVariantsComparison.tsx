import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanVariant } from '@/types/constraints';
import PlanVariantFeedbackCard from '@/components/feedback/PlanVariantFeedbackCard';
import type { VariantStrategy, UserChoice } from '@/types/feedback';

interface PlanVariantsComparisonProps {
  variants: PlanVariant[];
  onSelect?: (variant: PlanVariant) => void;
  runId?: string;
  tripId?: string;
  userId?: string;
  className?: string;
}

const VARIANT_LABELS: Record<PlanVariant['id'], string> = {
  conservative: '保守方案',
  balanced: '平衡方案',
  aggressive: '激进方案',
};

export default function PlanVariantsComparison({
  variants,
  onSelect,
  runId,
  tripId,
  userId,
  className,
}: PlanVariantsComparisonProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);

  if (variants.length === 0) return null;

  const handleSelectVariant = (variant: PlanVariant) => {
    setSelectedVariantId(variant.id);
    onSelect?.(variant);
    // 显示反馈卡片
    if (runId) {
      setShowFeedback(variant.id);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">方案对比</h3>
        <Badge variant="outline">{variants.length} 个方案</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {variants.map((variant) => (
          <Card
            key={variant.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg',
              variant.feasibility.isValid
                ? 'border-green-300'
                : 'border-yellow-300'
            )}
            onClick={() => onSelect?.(variant)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {VARIANT_LABELS[variant.id]}
                </CardTitle>
                <Badge
                  variant={variant.feasibility.isValid ? 'default' : 'secondary'}
                >
                  {variant.feasibility.isValid ? '可行' : '需调整'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 评分 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">综合评分</span>
                  <span className="text-lg font-bold">
                    {(variant.score.total * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">满意度：</span>
                    <span className="font-medium">
                      {(variant.score.breakdown.satisfaction * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">违约风险：</span>
                    <span className="font-medium">
                      {(variant.score.breakdown.violationRisk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">鲁棒性：</span>
                    <span className="font-medium">
                      {(variant.score.breakdown.robustness * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">成本：</span>
                    <span className="font-medium">
                      {(variant.score.breakdown.cost * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 方案摘要 */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>天数：{variant.planSummary.days} 天</div>
                  <div>活动数：{variant.planSummary.totalActivities} 个</div>
                  {variant.feasibility.violations > 0 && (
                    <div className="text-red-600">
                      违规项：{variant.feasibility.violations} 个
                    </div>
                  )}
                </div>
              </div>

              {/* 季节性警告 */}
              {variant.metadata?.seasonalWarnings && variant.metadata.seasonalWarnings.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <p className="text-xs font-medium text-amber-700">季节性警告</p>
                  </div>
                  <div className="space-y-1">
                    {variant.metadata.seasonalWarnings.map((warning, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          'text-xs p-2 rounded',
                          warning.severity === 'high' 
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : warning.severity === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        )}
                      >
                        <div className="font-medium mb-0.5">{warning.type}</div>
                        <div className="text-xs">{warning.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 权衡项 */}
              {variant.tradeoffs.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-1">权衡：</p>
                  <div className="space-y-1">
                    {variant.tradeoffs.map((tradeoff, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {tradeoff.sacrificed}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 选择按钮 */}
              <Button
                className="w-full mt-3"
                variant={variant.feasibility.isValid ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectVariant(variant);
                }}
              >
                选择此方案
              </Button>

              {/* 反馈卡片 */}
              {showFeedback === variant.id && runId && (
                <div className="mt-3 pt-3 border-t">
                  <PlanVariantFeedbackCard
                    runId={runId}
                    variantId={variant.id}
                    variantStrategy={variant.id as VariantStrategy}
                    userChoice="selected"
                    tripId={tripId}
                    userId={userId}
                    onSubmitted={() => setShowFeedback(null)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 拒绝方案的反馈（显示在底部） */}
      {selectedVariantId && variants.length > 1 && runId && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">对其他方案有反馈？</p>
          {variants
            .filter(v => v.id !== selectedVariantId)
            .map((variant) => (
              <div key={variant.id} className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="text-sm">
                    {VARIANT_LABELS[variant.id]} - 您拒绝了此方案
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFeedback(variant.id)}
                  >
                    提供反馈
                  </Button>
                </div>
                {showFeedback === variant.id && (
                  <PlanVariantFeedbackCard
                    runId={runId}
                    variantId={variant.id}
                    variantStrategy={variant.id as VariantStrategy}
                    userChoice="rejected"
                    tripId={tripId}
                    userId={userId}
                    onSubmitted={() => setShowFeedback(null)}
                  />
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
