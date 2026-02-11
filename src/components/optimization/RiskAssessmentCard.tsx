/**
 * 风险评估卡片组件
 * 
 * 展示 Monte Carlo 模拟的风险评估结果
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RiskAssessmentResponse, RiskFactor } from '@/types/optimization-v2';
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Shield,
  Info,
  BarChart3,
  Gauge,
} from 'lucide-react';

// ==================== 配置 ====================

/** 风险等级配置 */
const RISK_LEVEL_CONFIG = {
  low: {
    label: '低风险',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
  },
  medium: {
    label: '中等风险',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
  },
  high: {
    label: '高风险',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
  },
  critical: {
    label: '极高风险',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
  },
};

type RiskLevel = keyof typeof RISK_LEVEL_CONFIG;

// ==================== 工具函数 ====================

/** 根据下行风险计算风险等级 */
function getRiskLevel(downsideRisk: number): RiskLevel {
  if (downsideRisk < 0.1) return 'low';
  if (downsideRisk < 0.25) return 'medium';
  if (downsideRisk < 0.5) return 'high';
  return 'critical';
}

/** 根据可行概率计算颜色 */
function getFeasibilityColor(probability: number): string {
  if (probability >= 0.9) return 'text-green-600';
  if (probability >= 0.7) return 'text-blue-600';
  if (probability >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
}

// ==================== 子组件 ====================

/** 核心指标卡 */
function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'text-foreground',
  tooltip,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  tooltip?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm">
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn('text-xl font-bold tabular-nums', color)}>{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

/** 置信区间可视化 */
function ConfidenceIntervalBar({
  lower,
  upper,
  expected,
}: {
  lower: number;
  upper: number;
  expected: number;
}) {
  // 标准化到 0-100 范围
  const lowerPct = Math.round(lower * 100);
  const upperPct = Math.round(upper * 100);
  const expectedPct = Math.round(expected * 100);
  const rangePct = upperPct - lowerPct;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">95% 置信区间</span>
        <span className="font-medium tabular-nums">
          [{lowerPct}%, {upperPct}%]
        </span>
      </div>
      <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
        {/* 区间范围 */}
        <div
          className="absolute h-full bg-primary/20 rounded"
          style={{
            left: `${lowerPct}%`,
            width: `${rangePct}%`,
          }}
        />
        {/* 期望值标记 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary"
          style={{ left: `${expectedPct}%` }}
        />
        {/* 期望值标签 */}
        <div
          className="absolute -top-6 transform -translate-x-1/2 text-xs font-medium"
          style={{ left: `${expectedPct}%` }}
        >
          {expectedPct}%
        </div>
        {/* 刻度 */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="absolute bottom-0 w-px h-2 bg-border"
            style={{ left: `${tick}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/** 风险因素列表 */
function RiskFactorsList({
  factors,
  maxItems = 5,
}: {
  factors: RiskFactor[];
  maxItems?: number;
}) {
  const sortedFactors = [...factors]
    .sort((a, b) => b.impact * b.probability - a.impact * a.probability)
    .slice(0, maxItems);

  if (sortedFactors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        未检测到显著风险因素
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedFactors.map((factor, index) => {
        const riskScore = factor.impact * factor.probability;
        const riskLevel = riskScore < 0.1 ? 'low' : riskScore < 0.3 ? 'medium' : 'high';
        
        return (
          <div
            key={index}
            className="flex items-center gap-3 p-2 rounded-lg border bg-card"
          >
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
              riskLevel === 'low' ? 'bg-green-100 text-green-700' :
              riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            )}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{factor.factor}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>影响: {Math.round(factor.impact * 100)}%</span>
                <span>概率: {Math.round(factor.probability * 100)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">
                {Math.round(riskScore * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">风险值</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 风险仪表盘 */
function RiskGauge({
  value,
  size = 'default',
}: {
  value: number;
  size?: 'default' | 'large';
}) {
  const percentage = Math.round(value * 100);
  const riskLevel = getRiskLevel(value);
  const config = RISK_LEVEL_CONFIG[riskLevel] || RISK_LEVEL_CONFIG.medium;
  const Icon = config.icon;
  
  // 计算仪表盘角度 (0-180度)
  const angle = Math.min(value * 180, 180);
  
  const sizeClasses = size === 'large' 
    ? 'w-32 h-16' 
    : 'w-24 h-12';

  return (
    <div className="flex flex-col items-center">
      <div className={cn('relative', sizeClasses)}>
        {/* 背景弧 */}
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          {/* 填充弧 */}
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${angle * 0.785} 1000`}
            className={config.color}
          />
        </svg>
        {/* 指针 */}
        <div
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{
            transform: `translateX(-50%) rotate(${angle - 90}deg)`,
          }}
        >
          <div className={cn(
            'w-0.5 bg-foreground',
            size === 'large' ? 'h-10' : 'h-8'
          )} />
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className={cn('text-lg font-bold', config.color)}>
          {percentage}%
        </p>
        <Badge variant="outline" className={cn(config.bgColor, config.borderColor)}>
          <Icon className={cn('h-3 w-3 mr-1', config.color)} />
          {config.label}
        </Badge>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export interface RiskAssessmentCardProps {
  /** 风险评估结果 */
  assessment: RiskAssessmentResponse;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 是否显示风险因素 */
  showFactors?: boolean;
  /** 显示的最大风险因素数量 */
  maxFactors?: number;
  /** 标题 */
  title?: string;
  /** 自定义类名 */
  className?: string;
}

export function RiskAssessmentCard({
  assessment,
  compact = false,
  showFactors = true,
  maxFactors = 5,
  title = '风险评估',
  className,
}: RiskAssessmentCardProps) {
  const riskLevel = getRiskLevel(assessment.downsideRisk);
  const riskConfig = RISK_LEVEL_CONFIG[riskLevel] || RISK_LEVEL_CONFIG.medium;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(compact && 'pb-3')}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn('flex items-center gap-2', compact && 'text-base')}>
              <BarChart3 className="h-5 w-5" />
              {title}
            </CardTitle>
            {!compact && (
              <CardDescription>
                基于 Monte Carlo 模拟的风险分析
              </CardDescription>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={cn(riskConfig.bgColor, riskConfig.borderColor, riskConfig.color)}
          >
            <riskConfig.icon className="h-3 w-3 mr-1" />
            {riskConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'pt-0')}>
        {/* 核心指标 */}
        <div className={cn(
          'grid gap-3',
          compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
        )}>
          <MetricCard
            icon={Target}
            label="期望效用"
            value={`${Math.round(assessment.expectedUtility * 100)}%`}
            color={getFeasibilityColor(assessment.expectedUtility)}
            tooltip="Monte Carlo 模拟计算的期望效用值"
          />
          <MetricCard
            icon={Shield}
            label="可行概率"
            value={`${Math.round(assessment.feasibilityProbability * 100)}%`}
            color={getFeasibilityColor(assessment.feasibilityProbability)}
            tooltip="计划成功执行的概率"
          />
          <MetricCard
            icon={TrendingDown}
            label="下行风险"
            value={`${Math.round(assessment.downsideRisk * 100)}%`}
            color={riskConfig.color}
            tooltip="效用低于阈值的概率"
          />
          <MetricCard
            icon={Gauge}
            label="置信区间"
            value={`±${Math.round((assessment.confidenceInterval.upper - assessment.confidenceInterval.lower) * 50)}%`}
            subValue="95% CI"
            tooltip="效用值的不确定性范围"
          />
        </div>

        {/* 置信区间可视化 */}
        {!compact && (
          <div className="mt-6 p-4 rounded-lg bg-muted/30">
            <ConfidenceIntervalBar
              lower={assessment.confidenceInterval.lower}
              upper={assessment.confidenceInterval.upper}
              expected={assessment.expectedUtility}
            />
          </div>
        )}

        {/* 风险因素 */}
        {showFactors && assessment.riskFactors && assessment.riskFactors.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              主要风险因素
            </h4>
            <RiskFactorsList 
              factors={assessment.riskFactors} 
              maxItems={maxFactors} 
            />
          </div>
        )}

        {/* 建议 */}
        {assessment.recommendation && (
          <div className={cn(
            'mt-6 p-4 rounded-lg border',
            riskConfig.bgColor,
            riskConfig.borderColor
          )}>
            <div className="flex items-start gap-3">
              <Info className={cn('h-5 w-5 flex-shrink-0 mt-0.5', riskConfig.color)} />
              <div>
                <p className="font-medium mb-1">评估建议</p>
                <p className="text-sm text-muted-foreground">
                  {assessment.recommendation}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 导出 ====================

export default RiskAssessmentCard;
export { 
  MetricCard, 
  ConfidenceIntervalBar, 
  RiskFactorsList, 
  RiskGauge,
  RISK_LEVEL_CONFIG,
  getRiskLevel,
};
