/**
 * DataCard - 标准化数据卡片组件
 * 
 * 根据体验设计文档 v1.0，用于呈现单一数据点
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RiskScoreBadge } from './risk-score-display';

export interface DataCardProps {
  /**
   * 卡片标题
   */
  title: string;
  /**
   * 卡片描述（可选）
   */
  description?: string;
  /**
   * 关键指标
   */
  metrics: {
    label: string;
    value: string | number;
    unit?: string;
    highlight?: boolean;
  }[];
  /**
   * 风险评分（0-100，可选）
   */
  riskScore?: number;
  /**
   * 匹配度（0-100，可选）
   */
  matchScore?: number;
  /**
   * 行动按钮
   */
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'outline';
  }[];
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 是否推荐
   */
  recommended?: boolean;
}

/**
 * 数据卡片组件
 * 
 * 标准格式：
 * - 标题
 * - 关键指标（2列布局）
 * - 风险评估（如果有）
 * - 匹配度（如果有）
 * - 行动按钮
 */
export function DataCard({
  title,
  description,
  metrics,
  riskScore,
  matchScore,
  actions = [],
  className,
  recommended = false,
}: DataCardProps) {
  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        // 推荐标记：更克制的视觉表现（符合"Clarity over Charm"原则）
        recommended && 'ring-1 ring-[#4CAF50]/30 bg-[#E8F5E9]/30',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          {recommended && (
            <Badge className="bg-[#4CAF50] text-white border border-[#4CAF50]/20">
              推荐
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 关键指标 */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={cn(
                'text-center p-2 rounded',
                metric.highlight && 'bg-muted'
              )}
            >
              <div className="text-2xl font-bold">
                {metric.value}
                {metric.unit && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {metric.unit}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        {/* 风险评估 */}
        {riskScore !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">综合风险</span>
            <RiskScoreBadge score={riskScore} />
          </div>
        )}

        {/* 匹配度 */}
        {matchScore !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">你的匹配度</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    matchScore >= 90
                      ? 'bg-green-500'
                      : matchScore >= 70
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                  )}
                  style={{ width: `${matchScore}%` }}
                />
              </div>
              <span className="text-sm font-medium w-10 text-right">
                {matchScore}%
              </span>
            </div>
          </div>
        )}

        {/* 行动按钮 */}
        {actions.length > 0 && (
          <div className="flex gap-2 pt-2 border-t">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                size="sm"
                onClick={action.onClick}
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
