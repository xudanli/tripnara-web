/**
 * 疲劳预测图表组件
 * 
 * 展示按天的疲劳预测数据
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

// ==================== 类型 ====================

export interface FatiguePrediction {
  dayIndex: number;
  fatigueScore: number;
  riskLevel: string;
  recommendation: string;
  confidence?: number;
}

export interface FatiguePredictionChartProps {
  predictions: FatiguePrediction[];
  showRecommendations?: boolean;
  compact?: boolean;
  className?: string;
}

// ==================== 配置 ====================

const RISK_LEVEL_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  icon: React.ElementType;
}> = {
  LOW: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    label: '低',
    icon: CheckCircle,
  },
  MEDIUM: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    label: '中',
    icon: Info,
  },
  HIGH: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    label: '高',
    icon: AlertTriangle,
  },
  CRITICAL: {
    color: 'text-red-900',
    bgColor: 'bg-red-200',
    borderColor: 'border-red-500',
    label: '极高',
    icon: AlertTriangle,
  },
};

function getRiskConfig(level: string) {
  const normalizedLevel = level.toUpperCase();
  return RISK_LEVEL_CONFIG[normalizedLevel] || RISK_LEVEL_CONFIG.MEDIUM;
}

// ==================== 子组件 ====================

function FatigueBar({
  prediction,
  maxScore = 1,
  showLabel = true,
}: {
  prediction: FatiguePrediction;
  maxScore?: number;
  showLabel?: boolean;
}) {
  const percentage = Math.min(100, (prediction.fatigueScore / maxScore) * 100);
  const config = getRiskConfig(prediction.riskLevel);
  const Icon = config.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            {showLabel && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Day {prediction.dayIndex}</span>
                <div className="flex items-center gap-1">
                  <Icon className={cn('h-3 w-3', config.color)} />
                  <span className={config.color}>
                    {Math.round(prediction.fatigueScore * 100)}%
                  </span>
                </div>
              </div>
            )}
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  config.bgColor
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Day {prediction.dayIndex} 疲劳预测</p>
            <p className="text-xs">
              疲劳度: {Math.round(prediction.fatigueScore * 100)}%
            </p>
            <Badge variant="outline" className={cn('text-xs', config.bgColor, config.color)}>
              风险等级: {config.label}
            </Badge>
            {prediction.recommendation && (
              <p className="text-xs text-muted-foreground mt-1">
                {prediction.recommendation}
              </p>
            )}
            {prediction.confidence !== undefined && (
              <p className="text-xs text-muted-foreground">
                置信度: {Math.round(prediction.confidence * 100)}%
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FatigueTableRow({
  prediction,
}: {
  prediction: FatiguePrediction;
}) {
  const config = getRiskConfig(prediction.riskLevel);
  const Icon = config.icon;
  
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2 pr-4 font-medium text-sm">
        Day {prediction.dayIndex}
      </td>
      <td className="py-2 px-4">
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', config.bgColor)}
              style={{ width: `${Math.round(prediction.fatigueScore * 100)}%` }}
            />
          </div>
          <span className="text-sm tabular-nums">
            {Math.round(prediction.fatigueScore * 100)}%
          </span>
        </div>
      </td>
      <td className="py-2 px-4">
        <Badge 
          variant="outline" 
          className={cn('gap-1', config.bgColor, config.color, config.borderColor)}
        >
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </td>
      <td className="py-2 pl-4 text-sm text-muted-foreground">
        {prediction.recommendation || '-'}
      </td>
    </tr>
  );
}

// ==================== 主组件 ====================

export function FatiguePredictionChart({
  predictions,
  showRecommendations = true,
  compact = false,
  className,
}: FatiguePredictionChartProps) {
  const sortedPredictions = React.useMemo(
    () => [...predictions].sort((a, b) => a.dayIndex - b.dayIndex),
    [predictions]
  );
  
  const maxFatigue = React.useMemo(
    () => Math.max(...predictions.map(p => p.fatigueScore), 1),
    [predictions]
  );
  
  const highRiskDays = React.useMemo(
    () => predictions.filter(p => 
      ['HIGH', 'CRITICAL'].includes(p.riskLevel.toUpperCase())
    ),
    [predictions]
  );
  
  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        {sortedPredictions.map(prediction => (
          <FatigueBar
            key={prediction.dayIndex}
            prediction={prediction}
            maxScore={maxFatigue}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {highRiskDays.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">
            {highRiskDays.length} 天存在较高疲劳风险，建议关注 Day{' '}
            {highRiskDays.map(d => d.dayIndex).join(', ')}
          </p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">天数</th>
              <th className="pb-2 px-4 font-medium">疲劳度</th>
              <th className="pb-2 px-4 font-medium">风险</th>
              {showRecommendations && (
                <th className="pb-2 pl-4 font-medium">建议</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedPredictions.map(prediction => (
              <FatigueTableRow
                key={prediction.dayIndex}
                prediction={prediction}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <span>图例:</span>
        {Object.entries(RISK_LEVEL_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={cn('w-3 h-3 rounded', config.bgColor)} />
            <span>{config.label}风险</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FatiguePredictionChart;
