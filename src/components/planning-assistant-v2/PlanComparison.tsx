/**
 * Planning Assistant V2 - 方案对比组件
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import type { ComparePlansResponse } from '@/api/planning-assistant-v2';

interface PlanComparisonProps {
  comparison: ComparePlansResponse;
  onSelectPlan?: (planId: string) => void;
  selectedPlanId?: string;
  currency?: string; // 🆕 货币代码，默认 CNY
  className?: string;
}

export function PlanComparison({
  comparison,
  onSelectPlan,
  selectedPlanId,
  currency = 'CNY', // 🆕 默认货币
  className,
}: PlanComparisonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 方案列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparison.plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              'cursor-pointer transition-all',
              selectedPlanId === plan.id
                ? 'border-primary shadow-md ring-2 ring-primary/20'
                : 'hover:shadow-lg hover:border-primary/50'
            )}
            onClick={() => onSelectPlan?.(plan.id)}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {plan.name}
                {selectedPlanId === plan.id && (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {comparison.dimensions.map((dimension) => (
                <div key={dimension} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {dimension}
                  </span>
                  <span className="font-medium">
                    {typeof plan.scores[dimension] === 'number'
                      ? dimension === 'budget'
                        ? formatCurrency(plan.scores[dimension], currency)
                        : plan.scores[dimension]
                      : plan.scores[dimension]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 差异对比表 */}
      {comparison.differences && comparison.differences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">差异对比</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>维度</TableHead>
                  <TableHead>方案1</TableHead>
                  <TableHead>方案2</TableHead>
                  <TableHead>影响</TableHead>
                  <TableHead>说明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.differences.map((diff, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium capitalize">
                      {diff.field}
                    </TableCell>
                    <TableCell>
                      {typeof diff.plan1Value === 'number' &&
                      diff.field === 'budget'
                        ? formatCurrency(diff.plan1Value, currency)
                        : String(diff.plan1Value)}
                    </TableCell>
                    <TableCell>
                      {typeof diff.plan2Value === 'number' &&
                      diff.field === 'budget'
                        ? formatCurrency(diff.plan2Value, currency)
                        : String(diff.plan2Value)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          diff.impact === 'high'
                            ? 'destructive'
                            : diff.impact === 'medium'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {diff.impact}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {diff.descriptionCN || diff.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 推荐建议 */}
      {comparison.recommendation && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              推荐建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {comparison.recommendation.summaryCN ||
                comparison.recommendation.summary}
            </p>
            <div className="flex flex-wrap gap-2">
              {comparison.recommendation.bestBudget && (
                <Badge variant="secondary">
                  最佳预算：{comparison.recommendation.bestBudget}
                </Badge>
              )}
              {comparison.recommendation.bestRoute && (
                <Badge variant="secondary">
                  最佳路线：{comparison.recommendation.bestRoute}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
