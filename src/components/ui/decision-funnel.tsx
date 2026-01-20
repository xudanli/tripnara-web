/**
 * DecisionFunnel - 三层决策漏斗组件
 * 
 * 根据体验设计文档 v1.0，实现三层决策流程：
 * 1. 浏览（Browse）- 快速扫描
 * 2. 理解（Understand）- 深度学习
 * 3. 判断（Judge）- 做出决策
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ChevronRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { DataCard } from './data-card';
import { RiskScoreDisplay } from './risk-score-display';

export type DecisionStage = 'browse' | 'understand' | 'judge';

export interface DecisionOption {
  id: string;
  name: string;
  description?: string;
  metrics: {
    label: string;
    value: string | number;
    unit?: string;
    highlight?: boolean;
  }[];
  riskScore?: number;
  matchScore?: number;
  recommended?: boolean;
  details?: {
    whyNotPerfect?: string[];
    whyConsider?: string[];
    suggestions?: string;
  };
}

export interface DecisionFunnelProps {
  /**
   * 当前阶段
   */
  stage: DecisionStage;
  /**
   * 选项列表
   */
  options: DecisionOption[];
  /**
   * 当前选中的选项ID
   */
  selectedOptionId?: string;
  /**
   * 阶段改变回调
   */
  onStageChange?: (stage: DecisionStage) => void;
  /**
   * 选项选择回调
   */
  onOptionSelect?: (optionId: string) => void;
  /**
   * 确认决策回调
   */
  onConfirm?: (optionId: string) => void;
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 获取阶段的配置
 */
function getStageConfig(stage: DecisionStage) {
  switch (stage) {
    case 'browse':
      return {
        label: '浏览',
        description: '快速扫描选项，初步了解',
        icon: Info,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
      };
    case 'understand':
      return {
        label: '理解',
        description: '深入了解选项，对比分析',
        icon: AlertTriangle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
    case 'judge':
      return {
        label: '判断',
        description: '做出最终决策',
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
  }
}

/**
 * 三层决策漏斗组件
 */
export function DecisionFunnel({
  stage,
  options,
  selectedOptionId,
  onStageChange,
  onOptionSelect,
  onConfirm,
  className,
}: DecisionFunnelProps) {
  const selectedOption = selectedOptionId
    ? options.find((opt) => opt.id === selectedOptionId)
    : null;

  const stageConfig = getStageConfig(stage);

  // 浏览阶段：卡片矩阵
  if (stage === 'browse') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">选择你的方案</h3>
            <p className="text-sm text-muted-foreground mt-1">
              快速浏览选项，点击查看详情
            </p>
          </div>
          <Badge variant="outline" className={cn(stageConfig.color, stageConfig.bgColor)}>
            {stageConfig.label}阶段
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {options.map((option) => (
            <DataCard
              key={option.id}
              title={option.name}
              description={option.description}
              metrics={option.metrics}
              riskScore={option.riskScore}
              matchScore={option.matchScore}
              recommended={option.recommended}
              actions={[
                {
                  label: '查看详情',
                  onClick: () => {
                    onOptionSelect?.(option.id);
                    onStageChange?.('understand');
                  },
                  variant: 'outline',
                },
              ]}
            />
          ))}
        </div>
      </div>
    );
  }

  // 理解阶段：详情页
  if (stage === 'understand' && selectedOption) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStageChange?.('browse')}
            >
              ← 返回选择
            </Button>
            <div>
              <h3 className="text-lg font-semibold">{selectedOption.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                深入了解这个选项
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn(stageConfig.color, stageConfig.bgColor)}>
            {stageConfig.label}阶段
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：核心信息 */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>核心特征</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {selectedOption.metrics.map((metric, index) => (
                    <div key={index} className="text-center p-3 rounded bg-muted/50">
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
              </CardContent>
            </Card>

            {/* 风险评估 */}
            {selectedOption.riskScore !== undefined && (
              <RiskScoreDisplay
                overallScore={selectedOption.riskScore}
                showDetails={false}
              />
            )}

            {/* 为什么不完美 / 为什么推荐考虑 */}
            {selectedOption.details && (
              <Card>
                <CardHeader>
                  <CardTitle>详细分析</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedOption.details.whyNotPerfect &&
                    selectedOption.details.whyNotPerfect.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-orange-600 mb-2">
                          为什么不完美？
                        </h4>
                        <ul className="space-y-1">
                          {selectedOption.details.whyNotPerfect.map((reason, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-orange-500 mt-0.5">└─</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {selectedOption.details.whyConsider &&
                    selectedOption.details.whyConsider.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-600 mb-2">
                          但为什么推荐考虑？
                        </h4>
                        <ul className="space-y-1">
                          {selectedOption.details.whyConsider.map((reason, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">└─</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {selectedOption.details.suggestions && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">我的建议</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedOption.details.suggestions}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：操作区 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>你的匹配度</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOption.matchScore !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">匹配度</span>
                      <span className="text-lg font-bold">
                        {selectedOption.matchScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          selectedOption.matchScore >= 90
                            ? 'bg-green-500'
                            : selectedOption.matchScore >= 70
                            ? 'bg-yellow-500'
                            : 'bg-orange-500'
                        )}
                        style={{ width: `${selectedOption.matchScore}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedOption.matchScore >= 90
                        ? '最匹配'
                        : selectedOption.matchScore >= 70
                        ? '基本匹配'
                        : '需要调整'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  onStageChange?.('judge');
                }}
                className="w-full"
              >
                选择这个
              </Button>
              <Button
                variant="outline"
                onClick={() => onStageChange?.('browse')}
                className="w-full"
              >
                看其他方案
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 判断阶段：确认对话框
  if (stage === 'judge' && selectedOption) {
    return (
      <Card className={cn('border-2 border-gate-confirm-border', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gate-confirm-foreground" />
              确认你的选择
            </CardTitle>
            <Badge variant="outline" className={cn(stageConfig.color, stageConfig.bgColor)}>
              {stageConfig.label}阶段
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">你选择了：</p>
            <p className="text-lg font-semibold">{selectedOption.name}</p>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">这意味着：</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {selectedOption.metrics.map((metric, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <span>
                    {metric.label}：{metric.value}
                    {metric.unit && ` ${metric.unit}`}
                  </span>
                </li>
              ))}
              {selectedOption.riskScore !== undefined && (
                <li className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <span>风险评分：{selectedOption.riskScore}%</span>
                </li>
              )}
            </ul>
          </div>

          {selectedOption.riskScore !== undefined && selectedOption.riskScore > 60 && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠️ 这条路线的风险较高，需要充足准备。
              </p>
            </div>
          )}

          <Separator />

          <div className="flex gap-2">
            <Button
              onClick={() => {
                onConfirm?.(selectedOption.id);
              }}
              className="flex-1"
            >
              是，选择这个
            </Button>
            <Button
              variant="outline"
              onClick={() => onStageChange?.('understand')}
              className="flex-1"
            >
              看其他方案
            </Button>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              如果你选择"是"，我们会：
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              <li>1. 为你生成详细的准备清单</li>
              <li>2. 创建备选方案（以防体力不足）</li>
              <li>3. 告诉你关键的安全提示</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
