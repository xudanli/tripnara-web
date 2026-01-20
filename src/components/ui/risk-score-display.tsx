/**
 * RiskScoreDisplay - 风险评分展示组件
 * 
 * 根据体验设计文档 v1.0，实现风险评分的三层展示：
 * 1. 第一层：一句话总结
 * 2. 第二层：维度分解
 * 3. 第三层：详细分析
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  getRiskScoreConfig,
  getRiskScoreLevel,
  getRiskScoreMeaning,
  formatRiskScore,
  type RiskScoreLevel as RiskLevel,
} from '@/lib/risk-score';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';

export interface RiskDimension {
  name: string;
  score: number; // 0-100
  description?: string;
  source?: string;
  confidence?: number; // 0-100
}

export interface RiskScoreDisplayProps {
  /**
   * 综合风险评分（0-100）
   */
  overallScore: number;
  /**
   * 风险维度分解
   */
  dimensions?: RiskDimension[];
  /**
   * 是否显示详细分析（默认 false，点击展开）
   */
  showDetails?: boolean;
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 紧凑模式
   */
  compact?: boolean;
}

/**
 * 获取风险等级的图标
 */
function getRiskIcon(level: RiskLevel) {
  switch (level) {
    case 'very-low':
    case 'low-medium':
      return CheckCircle2;
    default:
      return AlertTriangle;
  }
}

/**
 * 风险评分展示组件
 */
export function RiskScoreDisplay({
  overallScore,
  dimensions = [],
  showDetails: initialShowDetails = false,
  className,
  compact = false,
}: RiskScoreDisplayProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  const config = getRiskScoreConfig(overallScore);
  const meaning = getRiskScoreMeaning(overallScore);
  const RiskIcon = getRiskIcon(getRiskScoreLevel(overallScore));

  // 计算平均维度评分（如果有维度数据）
  const avgDimensionScore = dimensions.length > 0
    ? Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length)
    : null;

  return (
    <Card className={cn('border-2', config.borderColor, className)}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-base flex items-center gap-2', compact && 'text-sm')}>
            <RiskIcon className={cn('w-4 h-4', config.color)} />
            风险评估
          </CardTitle>
          <Badge
            className={cn(
              config.bgColor,
              config.color,
              config.borderColor,
              'border'
            )}
          >
            {formatRiskScore(overallScore)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 第一层：一句话总结 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn('font-medium', config.color, compact && 'text-sm')}>
              {meaning}
            </span>
            {!compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-7 text-xs"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    查看详情
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 第二层：维度分解（如果有维度数据） */}
        {dimensions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                风险维度分解
              </div>
              <div className="space-y-2">
                {dimensions.map((dimension) => {
                  const dimConfig = getRiskScoreConfig(dimension.score);
                  const DimIcon = getRiskIcon(getRiskScoreLevel(dimension.score));
                  const isExpanded = expandedDimension === dimension.name;

                  return (
                    <div
                      key={dimension.name}
                      className={cn(
                        'rounded-lg border p-2 transition-colors',
                        dimConfig.borderColor,
                        isExpanded && dimConfig.bgColor
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <DimIcon className={cn('w-3.5 h-3.5', dimConfig.color)} />
                          <span className="text-xs font-medium">{dimension.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-16 h-1.5 rounded-full overflow-hidden bg-muted',
                            compact && 'w-12'
                          )}>
                            <div
                              className={cn('h-full transition-all', dimConfig.bgColor)}
                              style={{ width: `${dimension.score}%` }}
                            />
                          </div>
                          <span className={cn('text-xs font-medium w-10 text-right', dimConfig.color)}>
                            {formatRiskScore(dimension.score)}
                          </span>
                          {dimension.description && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedDimension(
                                isExpanded ? null : dimension.name
                              )}
                              className="h-5 w-5 p-0"
                            >
                              <Info className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 维度详细说明（展开时显示） */}
                      {isExpanded && dimension.description && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">
                            {dimension.description}
                          </p>
                          {dimension.source && (
                            <p className="text-xs text-muted-foreground/70">
                              来源：{dimension.source}
                            </p>
                          )}
                          {dimension.confidence !== undefined && (
                            <div className="mt-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                                <span>置信度</span>
                                <span>{dimension.confidence}%</span>
                              </div>
                              <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${dimension.confidence}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 第三层：详细分析（展开时显示） */}
        {showDetails && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">
                详细分析
              </div>
              <div className="text-xs space-y-3">
                <div className="p-2 rounded bg-muted/30 border border-border/50">
                  <p className="font-semibold text-foreground mb-1">风险等级</p>
                  <p className="text-foreground">
                    {config.label}（{formatRiskScore(overallScore)}）
                  </p>
                </div>
                
                <div className="p-2 rounded bg-muted/30 border border-border/50">
                  <p className="font-semibold text-foreground mb-1">含义</p>
                  <p className="text-foreground leading-relaxed">{meaning}</p>
                </div>
                
                {avgDimensionScore !== null && (
                  <div className="p-2 rounded bg-muted/30 border border-border/50">
                    <p className="font-semibold text-foreground mb-1">平均维度评分</p>
                    <p className="text-foreground">{formatRiskScore(avgDimensionScore)}</p>
                  </div>
                )}
                
                {dimensions.length > 0 && (
                  <div className="p-2 rounded bg-muted/30 border border-border/50">
                    <p className="font-semibold text-foreground mb-2">各维度详情</p>
                    <div className="space-y-2">
                      {dimensions.map((dim) => (
                        <div key={dim.name} className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{dim.name}</p>
                            {dim.source && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                来源：{dim.source}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatRiskScore(dim.score)}
                            </p>
                            {dim.confidence !== undefined && (
                              <p className="text-[10px] text-muted-foreground">
                                置信度 {dim.confidence}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 风险评分简要显示（仅显示第一层）
 */
export function RiskScoreBadge({
  score,
  showLabel = true,
  className,
}: {
  score: number;
  showLabel?: boolean;
  className?: string;
}) {
  const config = getRiskScoreConfig(score);
  const meaning = getRiskScoreMeaning(score);
  const RiskIcon = getRiskIcon(getRiskScoreLevel(score));

  return (
    <Badge
      className={cn(
        config.bgColor,
        config.color,
        config.borderColor,
        'border flex items-center gap-1',
        className
      )}
    >
      <RiskIcon className="w-3 h-3" />
      {formatRiskScore(score)}
      {showLabel && (
        <span className="ml-1 text-xs opacity-90">{config.label}</span>
      )}
    </Badge>
  );
}
