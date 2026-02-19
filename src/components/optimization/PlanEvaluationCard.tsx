/**
 * 计划评估卡片组件
 * 
 * 展示 8 维效用函数的雷达图可视化
 */

import * as React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { EvaluatePlanResponse, ObjectiveFunctionWeights } from '@/types/optimization-v2';
import { BREAKDOWN_TO_WEIGHT_KEY, DEFAULT_WEIGHTS } from '@/types/optimization-v2';
import {
  Shield,
  Sparkles,
  Compass,
  Clock,
  Battery,
  Cloud,
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ==================== 配置 ====================

/** 8 维度配置 */
const DIMENSION_CONFIG = {
  safetyScore: {
    key: 'safety',
    label: '安全',
    labelEn: 'Safety',
    icon: Shield,
    color: 'hsl(142, 76%, 36%)', // green
    description: '路线安全性评估',
  },
  experienceScore: {
    key: 'experience',
    label: '体验',
    labelEn: 'Experience',
    icon: Sparkles,
    color: 'hsl(262, 83%, 58%)', // purple
    description: '旅行体验质量',
  },
  philosophyScore: {
    key: 'philosophy',
    label: '哲学',
    labelEn: 'Philosophy',
    icon: Compass,
    color: 'hsl(213, 94%, 68%)', // blue
    description: '与旅行理念的契合度',
  },
  timeSlackScore: {
    key: 'timeSlack',
    label: '余量',
    labelEn: 'Time Slack',
    icon: Clock,
    color: 'hsl(45, 93%, 47%)', // yellow
    description: '时间缓冲充裕度',
  },
  fatigueRiskScore: {
    key: 'fatigueRisk',
    label: '疲劳',
    labelEn: 'Fatigue',
    icon: Battery,
    color: 'hsl(0, 84%, 60%)', // red
    description: '疲劳风险控制',
  },
  weatherRiskScore: {
    key: 'weatherRisk',
    label: '天气',
    labelEn: 'Weather',
    icon: Cloud,
    color: 'hsl(199, 89%, 48%)', // cyan
    description: '天气风险应对',
  },
  budgetScore: {
    key: 'budgetRisk',
    label: '预算',
    labelEn: 'Budget',
    icon: Wallet,
    color: 'hsl(25, 95%, 53%)', // orange
    description: '预算合理性',
  },
  crowdScore: {
    key: 'crowdAvoidance',
    label: '避流',
    labelEn: 'Crowd',
    icon: Users,
    color: 'hsl(330, 81%, 60%)', // pink
    description: '人流避开程度',
  },
} as const;

type DimensionKey = keyof typeof DIMENSION_CONFIG;

// ==================== 子组件 ====================

/** 效用等级 Badge */
function UtilityBadge({ value }: { value: number }) {
  const getLevel = (v: number) => {
    if (v >= 0.8) return { label: '优秀', variant: 'default' as const, className: 'bg-green-500' };
    if (v >= 0.6) return { label: '良好', variant: 'secondary' as const, className: 'bg-blue-500 text-white' };
    if (v >= 0.4) return { label: '一般', variant: 'outline' as const, className: 'bg-yellow-500 text-white' };
    return { label: '待优化', variant: 'destructive' as const, className: '' };
  };
  
  const level = getLevel(value);
  return (
    <Badge variant={level.variant} className={level.className}>
      {level.label}
    </Badge>
  );
}

/** 单维度指标行 */
function DimensionRow({
  dimension,
  score,
  weight,
  showWeight = false,
}: {
  dimension: DimensionKey;
  score: number;
  weight?: number;
  showWeight?: boolean;
}) {
  const config = DIMENSION_CONFIG[dimension];
  const Icon = config.icon;
  const s = Number(score);
  const percentage = Number.isNaN(s) ? 0 : Math.round(Math.max(0, Math.min(1, s)) * 100);
  
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{config.label}</span>
          <div className="flex items-center gap-2">
            {showWeight && weight !== undefined && !Number.isNaN(weight) && (
              <span className="text-xs text-muted-foreground">
                权重 {Math.round(weight * 100)}%
              </span>
            )}
            <span className="text-sm font-semibold tabular-nums">{percentage}%</span>
          </div>
        </div>
        <Progress 
          value={percentage} 
          className="h-1.5"
          style={{ 
            ['--tw-bg-opacity' as string]: 0.2,
            backgroundColor: `${config.color}20`,
          }}
        />
      </div>
    </div>
  );
}

/** 对比指示器 */
function ComparisonIndicator({ 
  currentValue, 
  compareValue 
}: { 
  currentValue: number; 
  compareValue: number;
}) {
  const curr = Number(currentValue);
  const comp = Number(compareValue);
  if (Number.isNaN(curr) || Number.isNaN(comp)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const diff = curr - comp;
  const percentage = Math.round(Math.abs(diff) * 100);
  
  if (Math.abs(diff) < 0.01) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs">持平</span>
      </div>
    );
  }
  
  if (diff > 0) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="h-3 w-3" />
        <span className="text-xs">+{percentage}%</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-red-600">
      <TrendingDown className="h-3 w-3" />
      <span className="text-xs">-{percentage}%</span>
    </div>
  );
}

// ==================== 主组件 ====================

export interface PlanEvaluationCardProps {
  /** 评估结果 */
  evaluation: EvaluatePlanResponse;
  /** 对比评估（可选，用于显示变化） */
  compareEvaluation?: EvaluatePlanResponse;
  /** 是否显示权重 */
  showWeights?: boolean;
  /** 是否显示雷达图 */
  showRadar?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 自定义类名 */
  className?: string;
}

export function PlanEvaluationCard({
  evaluation,
  compareEvaluation,
  showWeights = false,
  showRadar = true,
  compact = false,
  title = '计划评估',
  description,
  className,
}: PlanEvaluationCardProps) {
  // 准备雷达图数据
  const radarData = React.useMemo(() => {
    return Object.entries(DIMENSION_CONFIG).map(([key, config]) => {
      const score = evaluation.breakdown?.[key as DimensionKey] ?? 0;
      const compareScore = compareEvaluation?.breakdown?.[key as DimensionKey];
      
      return {
        dimension: config.label,
        dimensionEn: config.labelEn,
        score: Math.round(score * 100),
        compareScore: compareScore !== undefined ? Math.round(compareScore * 100) : undefined,
        fullMark: 100,
      };
    });
  }, [evaluation, compareEvaluation]);

  // 获取对应的权重（breakdown key -> weight key）；API 未返回时用默认权重
  const getWeight = (key: DimensionKey): number => {
    const weightKey = BREAKDOWN_TO_WEIGHT_KEY[key] ?? DIMENSION_CONFIG[key].key as keyof ObjectiveFunctionWeights;
    return evaluation.weightsUsed?.[weightKey] ?? DEFAULT_WEIGHTS[weightKey] ?? 0;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn(compact && 'text-base')}>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums">
              {Number.isNaN(Number(evaluation.totalUtility)) ? '—' : Math.round((evaluation.totalUtility ?? 0) * 100)}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <UtilityBadge value={Number(evaluation.totalUtility) || 0} />
          </div>
        </div>
        {compareEvaluation && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">相比原方案：</span>
            <ComparisonIndicator 
              currentValue={evaluation.totalUtility} 
              compareValue={compareEvaluation.totalUtility} 
            />
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(compact && 'pt-0')}>
        <div className={cn(
          'grid gap-6',
          showRadar && !compact ? 'lg:grid-cols-2' : ''
        )}>
          {/* 雷达图 */}
          {showRadar && (
            <div className={cn('w-full', compact ? 'h-48' : 'h-64')}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="dimension" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }}
                    tickCount={5}
                  />
                  {compareEvaluation && (
                    <Radar
                      name="原方案"
                      dataKey="compareScore"
                      stroke="hsl(var(--muted-foreground))"
                      fill="hsl(var(--muted-foreground))"
                      fillOpacity={0.1}
                      strokeDasharray="4 4"
                    />
                  )}
                  <Radar
                    name="当前方案"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
                          <p className="font-medium">{data.dimension}</p>
                          <p className="text-sm text-primary">
                            当前: {data.score}%
                          </p>
                          {data.compareScore !== undefined && (
                            <p className="text-sm text-muted-foreground">
                              原方案: {data.compareScore}%
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 维度列表 */}
          <div className={cn('space-y-1', compact && 'space-y-0')}>
            {Object.keys(DIMENSION_CONFIG).map((key) => (
              <DimensionRow
                key={key}
                dimension={key as DimensionKey}
                score={evaluation.breakdown?.[key as DimensionKey] ?? 0}
                weight={getWeight(key as DimensionKey)}
                showWeight={showWeights}
              />
            ))}
          </div>
        </div>

        {/* 评估时间 */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          评估时间: {evaluation.timestamp
            ? (() => {
                const d = new Date(evaluation.timestamp);
                return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN');
              })()
            : '—'}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 导出 ====================

export default PlanEvaluationCard;
export { DIMENSION_CONFIG, UtilityBadge, DimensionRow, ComparisonIndicator };
