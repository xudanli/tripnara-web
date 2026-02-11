/**
 * 计划对比视图组件
 * 
 * 并排展示两个计划的评估结果对比
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { 
  ComparePlansResponse, 
  EvaluatePlanResponse,
  RoutePlanDraft,
} from '@/types/optimization-v2';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Check,
  X,
  Trophy,
  Scale,
  GitCompare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ==================== 配置 ====================

const DIMENSION_LABELS: Record<string, { label: string; description: string }> = {
  safety: { label: '安全', description: '路线安全性评估' },
  experience: { label: '体验', description: '旅行体验质量' },
  philosophy: { label: '哲学', description: '与旅行理念的契合度' },
  timeSlack: { label: '余量', description: '时间缓冲充裕度' },
  fatigueRisk: { label: '疲劳', description: '疲劳风险控制' },
  weatherRisk: { label: '天气', description: '天气风险应对' },
  budget: { label: '预算', description: '预算合理性' },
  crowd: { label: '避流', description: '人流避开程度' },
};

// ==================== 子组件 ====================

/** 差异指示器 */
function DifferenceIndicator({ 
  diff, 
  size = 'default',
  showLabel = true,
}: { 
  diff: number;
  size?: 'default' | 'large';
  showLabel?: boolean;
}) {
  const absDiff = Math.abs(diff);
  const percentage = Math.round(absDiff * 100);
  
  if (absDiff < 0.01) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className={cn('h-4 w-4', size === 'large' && 'h-5 w-5')} />
        {showLabel && <span className="text-sm">持平</span>}
      </div>
    );
  }
  
  if (diff > 0) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <ArrowUp className={cn('h-4 w-4', size === 'large' && 'h-5 w-5')} />
        {showLabel && (
          <span className={cn('font-medium', size === 'large' && 'text-lg')}>
            +{percentage}%
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-red-600">
      <ArrowDown className={cn('h-4 w-4', size === 'large' && 'h-5 w-5')} />
      {showLabel && (
        <span className={cn('font-medium', size === 'large' && 'text-lg')}>
          -{percentage}%
        </span>
      )}
    </div>
  );
}

/** 获胜者徽章 */
function WinnerBadge({ 
  winner, 
  planLabel 
}: { 
  winner: 'A' | 'B' | 'EQUAL';
  planLabel: 'A' | 'B';
}) {
  if (winner === 'EQUAL') {
    return (
      <Badge variant="outline" className="bg-gray-50">
        <Minus className="h-3 w-3 mr-1" />
        平局
      </Badge>
    );
  }
  
  if (winner === planLabel) {
    return (
      <Badge className="bg-green-500">
        <Trophy className="h-3 w-3 mr-1" />
        胜出
      </Badge>
    );
  }
  
  return null;
}

/** 维度对比行 */
function DimensionComparisonRow({
  dimension,
  scoreA,
  scoreB,
  winner,
}: {
  dimension: string;
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | 'EQUAL';
}) {
  const config = DIMENSION_LABELS[dimension] || { label: dimension, description: '' };
  const diff = scoreA - scoreB;
  const percentA = Math.round(scoreA * 100);
  const percentB = Math.round(scoreB * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
            {/* 方案 A 分数 */}
            <div className={cn(
              'flex items-center gap-2',
              winner === 'A' && 'font-semibold text-green-600'
            )}>
              <span className="text-lg tabular-nums">{percentA}%</span>
              {winner === 'A' && <Check className="h-4 w-4" />}
            </div>
            
            {/* 维度标签 */}
            <div className="text-center">
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            
            {/* 方案 B 分数 */}
            <div className={cn(
              'flex items-center justify-end gap-2',
              winner === 'B' && 'font-semibold text-green-600'
            )}>
              {winner === 'B' && <Check className="h-4 w-4" />}
              <span className="text-lg tabular-nums">{percentB}%</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            差异: {diff > 0 ? '+' : ''}{Math.round(diff * 100)}%
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** 总分对比卡 */
function TotalScoreComparison({
  scoreA,
  scoreB,
  winner,
  labelA = '方案 A',
  labelB = '方案 B',
}: {
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | 'EQUAL';
  labelA?: string;
  labelB?: string;
}) {
  const diff = scoreA - scoreB;
  const percentA = Math.round(scoreA * 100);
  const percentB = Math.round(scoreB * 100);

  return (
    <div className="grid grid-cols-[1fr,auto,1fr] gap-6 items-center">
      {/* 方案 A */}
      <div className={cn(
        'text-center p-4 rounded-xl border-2 transition-all',
        winner === 'A' 
          ? 'border-green-500 bg-green-50' 
          : 'border-muted bg-muted/30'
      )}>
        <p className="text-sm text-muted-foreground mb-1">{labelA}</p>
        <p className={cn(
          'text-4xl font-bold tabular-nums',
          winner === 'A' ? 'text-green-600' : ''
        )}>
          {percentA}
        </p>
        <WinnerBadge winner={winner} planLabel="A" />
      </div>

      {/* VS 分隔 */}
      <div className="flex flex-col items-center gap-2">
        <GitCompare className="h-6 w-6 text-muted-foreground" />
        <DifferenceIndicator diff={diff} size="large" />
      </div>

      {/* 方案 B */}
      <div className={cn(
        'text-center p-4 rounded-xl border-2 transition-all',
        winner === 'B' 
          ? 'border-green-500 bg-green-50' 
          : 'border-muted bg-muted/30'
      )}>
        <p className="text-sm text-muted-foreground mb-1">{labelB}</p>
        <p className={cn(
          'text-4xl font-bold tabular-nums',
          winner === 'B' ? 'text-green-600' : ''
        )}>
          {percentB}
        </p>
        <WinnerBadge winner={winner} planLabel="B" />
      </div>
    </div>
  );
}

/** 维度柱状对比图 */
function DimensionBarChart({
  comparison,
}: {
  comparison: ComparePlansResponse['dimensionComparison'];
}) {
  const dimensions = Object.entries(comparison);
  
  return (
    <div className="space-y-3">
      {dimensions.map(([key, data]) => {
        const config = DIMENSION_LABELS[key] || { label: key };
        const maxScore = Math.max(data.a, data.b);
        const scaleA = maxScore > 0 ? (data.a / maxScore) * 100 : 0;
        const scaleB = maxScore > 0 ? (data.b / maxScore) * 100 : 0;
        
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{config.label}</span>
              <span className="text-muted-foreground">
                {Math.round(data.a * 100)} vs {Math.round(data.b * 100)}
              </span>
            </div>
            <div className="flex gap-1 h-4">
              <div className="flex-1 bg-muted rounded-l overflow-hidden">
                <div 
                  className={cn(
                    'h-full transition-all',
                    data.winner === 'A' ? 'bg-green-500' : 'bg-blue-400'
                  )}
                  style={{ width: `${scaleA}%`, marginLeft: 'auto' }}
                />
              </div>
              <div className="flex-1 bg-muted rounded-r overflow-hidden">
                <div 
                  className={cn(
                    'h-full transition-all',
                    data.winner === 'B' ? 'bg-green-500' : 'bg-orange-400'
                  )}
                  style={{ width: `${scaleB}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== 主组件 ====================

export interface PlanComparisonViewProps {
  /** 对比结果 */
  comparison: ComparePlansResponse;
  /** 方案 A 评估（可选，用于显示详细分数） */
  evaluationA?: EvaluatePlanResponse;
  /** 方案 B 评估（可选，用于显示详细分数） */
  evaluationB?: EvaluatePlanResponse;
  /** 方案 A 标签 */
  labelA?: string;
  /** 方案 B 标签 */
  labelB?: string;
  /** 选择方案回调 */
  onSelectPlan?: (plan: 'A' | 'B') => void;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function PlanComparisonView({
  comparison,
  evaluationA,
  evaluationB,
  labelA = '原方案',
  labelB = '优化方案',
  onSelectPlan,
  compact = false,
  className,
}: PlanComparisonViewProps) {
  // 计算各方案的总分
  const scoreA = evaluationA?.totalUtility ?? 0;
  const scoreB = evaluationB?.totalUtility ?? 
    (scoreA + comparison.utilityDifference * -1); // 从差值反推

  return (
    <Card className={className}>
      <CardHeader className={cn(compact && 'pb-3')}>
        <CardTitle className={cn(
          'flex items-center gap-2',
          compact && 'text-base'
        )}>
          <Scale className="h-5 w-5" />
          方案对比
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 总分对比 */}
        <TotalScoreComparison
          scoreA={scoreA}
          scoreB={scoreB}
          winner={comparison.preferredPlan}
          labelA={labelA}
          labelB={labelB}
        />

        <Separator />

        {/* 维度对比 */}
        <div>
          <h4 className="text-sm font-medium mb-3">各维度对比</h4>
          
          {/* 表头 */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center py-2 px-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-400" />
              {labelA}
            </div>
            <div>维度</div>
            <div className="flex items-center justify-end gap-2">
              {labelB}
              <div className="w-3 h-3 rounded bg-orange-400" />
            </div>
          </div>
          
          {/* 对比行 */}
          <div className="divide-y">
            {Object.entries(comparison.dimensionComparison).map(([key, data]) => (
              <DimensionComparisonRow
                key={key}
                dimension={key}
                scoreA={data.a}
                scoreB={data.b}
                winner={data.winner as 'A' | 'B' | 'EQUAL'}
              />
            ))}
          </div>
        </div>

        {/* 柱状图视图 */}
        {!compact && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">可视化对比</h4>
              <DimensionBarChart comparison={comparison.dimensionComparison} />
            </div>
          </>
        )}

        {/* 选择按钮 */}
        {onSelectPlan && (
          <>
            <Separator />
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={comparison.preferredPlan === 'A' ? 'default' : 'outline'}
                onClick={() => onSelectPlan('A')}
                className="min-w-32"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                选择 {labelA}
              </Button>
              <Button
                variant={comparison.preferredPlan === 'B' ? 'default' : 'outline'}
                onClick={() => onSelectPlan('B')}
                className="min-w-32"
              >
                选择 {labelB}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* 结论 */}
        <div className={cn(
          'p-4 rounded-lg',
          comparison.preferredPlan === 'EQUAL' 
            ? 'bg-gray-50 border border-gray-200'
            : 'bg-green-50 border border-green-200'
        )}>
          <div className="flex items-center gap-2">
            {comparison.preferredPlan === 'EQUAL' ? (
              <>
                <Minus className="h-5 w-5 text-gray-500" />
                <p className="font-medium">两个方案效用相当</p>
              </>
            ) : (
              <>
                <Trophy className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-700">
                  推荐选择「{comparison.preferredPlan === 'A' ? labelA : labelB}」
                </p>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            效用差异: {comparison.utilityDifference > 0 ? '+' : ''}
            {Math.round(comparison.utilityDifference * 100)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 导出 ====================

export default PlanComparisonView;
export {
  DifferenceIndicator,
  WinnerBadge,
  DimensionComparisonRow,
  TotalScoreComparison,
  DimensionBarChart,
  DIMENSION_LABELS,
};
