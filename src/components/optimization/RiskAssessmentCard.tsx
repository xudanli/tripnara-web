/**
 * 风险评估卡片组件
 * 
 * 展示 Monte Carlo 模拟的风险评估结果
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RiskAssessmentResponse, RiskFactor } from '@/types/optimization-v2';
import { AlertTriangle, CheckCircle, TrendingDown, Target, Shield, Info, BarChart3, Gauge } from 'lucide-react';

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
  const v = Number(downsideRisk);
  if (Number.isNaN(v) || v < 0) return 'medium'; // 无效值按中等处理
  if (v < 0.1) return 'low';
  if (v < 0.25) return 'medium';
  if (v < 0.5) return 'high';
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
  compact = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  tooltip?: string;
  compact?: boolean;
}) {
  const content = (
    <div className={cn(
      'flex items-center rounded-lg bg-muted/50',
      compact ? 'gap-1.5 p-2' : 'gap-3 p-3'
    )}>
      <div className={cn(
        'flex items-center justify-center rounded bg-background shadow-sm',
        compact ? 'h-6 w-6' : 'h-10 w-10 rounded-lg'
      )}>
        <Icon className={cn(compact ? 'h-3 w-3' : 'h-5 w-5', color)} />
      </div>
      <div>
        <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-sm')}>{label}</p>
        <p className={cn('font-bold tabular-nums', color, compact ? 'text-sm' : 'text-xl')}>{value}</p>
        {subValue && !compact && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );

  if (tooltip && !compact) {
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

/** 安全格式化为百分比，避免 NaN */
function formatPct(value: number | undefined): string {
  const v = Number(value);
  return Number.isNaN(v) ? '—' : `${Math.round(v * 100)}%`;
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
      <CardHeader className={cn(compact ? 'p-3 pb-2' : '')}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn('flex items-center gap-2', compact ? 'text-sm' : '')}>
              <BarChart3 className={cn(compact ? 'h-4 w-4' : 'h-5 w-5')} />
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
            className={cn(riskConfig.bgColor, riskConfig.borderColor, riskConfig.color, compact && 'text-xs')}
          >
            <riskConfig.icon className="h-3 w-3 mr-1" />
            {riskConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn(compact ? 'p-3 pt-0' : '')}>
        {/* 核心指标 */}
        <div className={cn(
          'grid',
          compact ? 'grid-cols-4 gap-2' : 'grid-cols-2 lg:grid-cols-4 gap-3'
        )}>
          <MetricCard
            icon={Target}
            label="期望效用"
            value={formatPct(assessment.expectedUtility)}
            color={getFeasibilityColor(Number(assessment.expectedUtility) || 0)}
            tooltip="Monte Carlo 模拟计算的期望效用值"
            compact={compact}
          />
          <MetricCard
            icon={Shield}
            label="可行概率"
            value={formatPct(assessment.feasibilityProbability)}
            color={getFeasibilityColor(Number(assessment.feasibilityProbability) || 0)}
            tooltip="计划成功执行的概率"
            compact={compact}
          />
          <MetricCard
            icon={TrendingDown}
            label="下行风险"
            value={formatPct(assessment.downsideRisk)}
            color={riskConfig.color}
            tooltip="效用低于阈值的概率"
            compact={compact}
          />
          <MetricCard
            icon={Gauge}
            label="置信区间"
            value={assessment.confidenceInterval ? (() => {
              const lo = Number(assessment.confidenceInterval.lower);
              const hi = Number(assessment.confidenceInterval.upper);
              const range = hi - lo;
              return Number.isNaN(range) ? '—' : `±${Math.round(range * 50)}%`;
            })() : '—'}
            subValue="95% CI"
            tooltip="效用值的不确定性范围"
            compact={compact}
          />
        </div>

        {/* 置信区间可视化（需有效数值，避免 NaN） */}
        {!compact && assessment.confidenceInterval && (() => {
          const lower = Number(assessment.confidenceInterval.lower);
          const upper = Number(assessment.confidenceInterval.upper);
          const expected = Number(assessment.expectedUtility);
          if (Number.isNaN(lower) || Number.isNaN(upper) || Number.isNaN(expected)) return null;
          return (
            <div className="mt-6 p-4 rounded-lg bg-muted/30">
              <ConfidenceIntervalBar lower={lower} upper={upper} expected={expected} />
            </div>
          );
        })()}

        {/* 风险因素 */}
        {showFactors && assessment.riskFactors && assessment.riskFactors.length > 0 && !compact && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
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
        {assessment.recommendation && !compact && (
          <div className={cn(
            'mt-4 p-3 rounded-lg border',
            riskConfig.bgColor,
            riskConfig.borderColor
          )}>
            <div className="flex items-start gap-2">
              <Info className={cn('h-4 w-4 flex-shrink-0 mt-0.5', riskConfig.color)} />
              <div>
                <p className="font-medium text-sm mb-0.5">评估建议</p>
                <p className="text-xs text-muted-foreground">
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
