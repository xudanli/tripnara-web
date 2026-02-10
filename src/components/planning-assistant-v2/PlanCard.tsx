/**
 * Planning Assistant V2 - 方案卡片组件
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import type { Plan } from '@/api/planning-assistant-v2';

interface PlanCardProps {
  plan: Plan;
  isSelected?: boolean;
  onSelect?: (planId: string) => void;
  currency?: string; // 🆕 货币代码，默认 CNY
  className?: string;
}

const paceLabels: Record<string, string> = {
  relaxed: '轻松',
  moderate: '适中',
  intensive: '紧凑',
};

const paceColors: Record<string, string> = {
  relaxed: 'bg-green-100 text-green-700',
  moderate: 'bg-blue-100 text-blue-700',
  intensive: 'bg-orange-100 text-orange-700',
};

export function PlanCard({
  plan,
  isSelected,
  onSelect,
  currency = 'CNY', // 🆕 默认货币
  className,
}: PlanCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        isSelected
          ? 'border-primary shadow-md ring-2 ring-primary/20'
          : 'hover:shadow-lg hover:border-primary/50',
        className
      )}
      onClick={() => onSelect?.(plan.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {plan.nameCN || plan.name}
              {isSelected && (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {plan.destination}
            </CardDescription>
          </div>
          <Badge className={cn('text-xs', paceColors[plan.pace] || 'bg-gray-100 text-gray-700')}>
            {paceLabels[plan.pace] || plan.pace}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {plan.destination}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {plan.duration} 天
          </span>
        </div>

        {/* 亮点 */}
        {plan.highlights && plan.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {plan.highlights.slice(0, 4).map((h, i) => (
              <Badge key={i} variant="outline" className="text-xs py-0">
                {h}
              </Badge>
            ))}
          </div>
        )}

        {/* 预算展示 */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">预算估算</span>
            <span className="text-lg font-semibold text-primary">
              {formatCurrency(plan.estimatedBudget.total, currency)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {Object.entries(plan.estimatedBudget.breakdown)
              .slice(0, 4)
              .map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-muted-foreground capitalize">{key}</div>
                  <div className="font-medium">
                    {formatCurrency(value, currency)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 适合度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">适合度</span>
            <span className="font-medium">{plan.suitability.score}%</span>
          </div>
          <Progress value={plan.suitability.score} className="h-1.5" />
          {plan.suitability.reasons && plan.suitability.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {plan.suitability.reasons.slice(0, 2).map((reason, i) => (
                <span key={i} className="text-xs text-muted-foreground">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 警告 */}
        {plan.warnings && plan.warnings.length > 0 && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            ⚠️ {plan.warnings.join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
