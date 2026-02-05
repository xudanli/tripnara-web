/**
 * 规划Tab - 健康度详情面板组件
 * 显示4个维度的健康度指标详情
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Shield, Activity, AlertTriangle, DollarSign, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Health } from '@/api/trip-detail';

interface PlanHealthPanelProps {
  health: Health | null;
  loading?: boolean;
  onMetricClick?: (metric: string) => void;
}

export default function PlanHealthPanel({
  health,
  loading = false,
  onMetricClick,
}: PlanHealthPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">健康度详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">健康度详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">暂无数据</div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      key: 'schedule',
      label: '时间安排',
      value: health.dimensions.schedule.score,
      icon: Shield,
      description: '行程的时间安排合理性',
    },
    {
      key: 'pace',
      label: '缓冲',
      value: health.dimensions.pace.score,
      icon: Activity,
      description: '时间缓冲充足度',
    },
    {
      key: 'risk',
      label: '风险',
      // 风险 = 100 - 可执行度（feasibility越高，风险越低）
      value: 100 - health.dimensions.feasibility.score,
      icon: AlertTriangle,
      description: '行程风险等级',
    },
    {
      key: 'budget',
      label: '成本',
      value: health.dimensions.budget.score,
      icon: DollarSign,
      description: '预算使用情况',
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: '良好', variant: 'default' as const, className: 'bg-green-100 text-green-700' };
    if (score >= 60) return { label: '需注意', variant: 'default' as const, className: 'bg-yellow-100 text-yellow-700' };
    return { label: '需修复', variant: 'destructive' as const, className: 'bg-red-100 text-red-700' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" />
          健康度详情
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const scoreBadge = getScoreBadge(metric.value);
          
          return (
            <div
              key={metric.key}
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-colors',
                getScoreBgColor(metric.value),
                onMetricClick && 'hover:bg-opacity-80'
              )}
              onClick={() => onMetricClick?.(metric.key)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn('w-4 h-4', getScoreColor(metric.value))} />
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-base font-bold', getScoreColor(metric.value))}>
                    {metric.value}
                  </span>
                  <Badge variant="outline" className={cn('text-xs', scoreBadge.className)}>
                    {scoreBadge.label}
                  </Badge>
                </div>
              </div>
              <Progress
                value={metric.value}
                className={cn('h-2', {
                  'bg-green-200': metric.value >= 80,
                  'bg-yellow-200': metric.value >= 60 && metric.value < 80,
                  'bg-red-200': metric.value < 60,
                })}
              />
              {onMetricClick && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" />
                  <span>点击查看详情</span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
