/**
 * 指标详细说明弹窗
 * 显示健康度指标的详细说明（定义、计算方法、理想范围、当前状态分析）
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { tripDetailApi, type MetricExplanation } from '@/api/trip-detail';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, XCircle, Info, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricExplanationDialogProps {
  tripId: string;
  metricName: 'schedule' | 'budget' | 'pace' | 'feasibility' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 指标名称映射（包含默认权重，根据产品需求文档：可执行度40%、缓冲20%、风险30%、成本10%）
const metricNameMap: Record<string, { displayName: string; icon: typeof CheckCircle2; defaultWeight: number }> = {
  schedule: { displayName: '时间灵活性', icon: CheckCircle2, defaultWeight: 0.4 }, // 可执行度 40%
  budget: { displayName: '预算控制', icon: TrendingUp, defaultWeight: 0.2 }, // 缓冲 20%
  pace: { displayName: '节奏合理性', icon: AlertTriangle, defaultWeight: 0.3 }, // 风险（反转后）30%
  feasibility: { displayName: '可达性', icon: XCircle, defaultWeight: 0.1 }, // 成本 10%
};

// 🆕 获取默认的计算方法（当接口未返回时使用）
function getDefaultCalculation(metricName: string): NonNullable<MetricExplanation['calculation']> {
  const calculations: Record<string, MetricExplanation['calculation']> = {
    schedule: {
      formula: '时间灵活性 = (可用时间窗 - 时间冲突) / 总时间 × 100%',
      parameters: [
        { name: '可用时间窗', description: '行程中可用于安排活动的时间段总和' },
        { name: '时间冲突', description: '行程项之间的时间重叠或冲突时长' },
        { name: '总时间', description: '行程的总时长' },
      ],
    },
    budget: {
      formula: '预算控制 = (预算上限 - 预计花费) / 预算上限 × 100%',
      parameters: [
        { name: '预算上限', description: '用户设定的预算上限' },
        { name: '预计花费', description: '根据行程项计算的预计总花费' },
      ],
    },
    pace: {
      formula: '节奏合理性 = 100% - (疲劳指数 × 0.5) - (缓冲不足率 × 0.3)',
      parameters: [
        { name: '疲劳指数', description: '基于活动强度和休息时间的综合疲劳评估（0-100）' },
        { name: '缓冲不足率', description: '缓冲时间不足的天数占比（0-100%）' },
      ],
    },
    feasibility: {
      formula: '可达性 = (可达行程项数 / 总行程项数) × 100%',
      parameters: [
        { name: '可达行程项数', description: '在当前条件下可以到达和完成的行程项数量' },
        { name: '总行程项数', description: '行程中的总行程项数量' },
      ],
    },
  };
  
  return calculations[metricName] || {
    formula: '计算方法待完善',
    parameters: [],
  };
}

// 🆕 获取默认的理想范围（当接口未返回时使用）
function getDefaultIdealRange(): MetricExplanation['idealRange'] {
  return {
    excellent: { min: 80, max: 100 }, // ≥ 80%
    good: { min: 60, max: 79 }, // 60-79%
    needsImprovement: { min: 0, max: 59 }, // < 60%
  };
}

export function MetricExplanationDialog({
  tripId,
  metricName,
  open,
  onOpenChange,
}: MetricExplanationDialogProps) {
  const [explanation, setExplanation] = useState<MetricExplanation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && metricName && tripId) {
      loadExplanation();
    } else {
      setExplanation(null);
    }
  }, [open, metricName, tripId]);

  const loadExplanation = async () => {
    if (!metricName || !tripId) return;
    
    setLoading(true);
    try {
      const data = await tripDetailApi.getMetricExplanation(tripId, metricName);
      
      // 🆕 检查所有字段，包括 calculation 和 idealRange
      console.log('[MetricExplanationDialog] 收到 API 响应:', {
        metricName: data.metricName,
        displayName: data.displayName,
        hasWeight: 'weight' in data,
        weight: data.weight,
        hasContribution: 'contribution' in data,
        contribution: data.contribution,
        hasCalculation: 'calculation' in data,
        calculation: data.calculation,
        calculationType: typeof data.calculation,
        hasIdealRange: 'idealRange' in data,
        idealRange: data.idealRange,
        idealRangeType: typeof data.idealRange,
        hasDefinition: 'definition' in data,
        definition: data.definition,
        hasCurrentState: 'currentState' in data,
        currentState: data.currentState,
      });
      
      // 🆕 如果 API 返回的数据缺少 metricName 或 displayName，从传入的参数补充
      const enrichedData: MetricExplanation = {
        ...data,
        metricName: data.metricName || metricName,
        displayName: data.displayName || (metricNameMap[metricName]?.displayName || metricName),
        // 🆕 如果 weight 缺失，使用默认权重（根据产品需求文档）
        weight: data.weight ?? (metricNameMap[metricName]?.defaultWeight ?? 0.25),
        // 🆕 如果 calculation 缺失或为空，提供默认值
        calculation: (data.calculation && 
          (data.calculation.formula || 
           (data.calculation.parameters && data.calculation.parameters.length > 0)))
          ? data.calculation
          : getDefaultCalculation(metricName),
        // 🆕 如果 idealRange 缺失或为空，提供默认值
        idealRange: (data.idealRange && 
          data.idealRange.excellent && 
          typeof data.idealRange.excellent.min === 'number')
          ? data.idealRange
          : getDefaultIdealRange(),
      };
      
      // 🆕 如果 contribution 缺失，计算它
      if (enrichedData.contribution === undefined && enrichedData.currentState?.score !== undefined) {
        enrichedData.contribution = enrichedData.currentState.score * enrichedData.weight;
      }
      
      console.log('[MetricExplanationDialog] 处理后的数据:', {
        weight: enrichedData.weight,
        contribution: enrichedData.contribution,
        score: enrichedData.currentState?.score,
        hasCalculation: !!enrichedData.calculation,
        hasIdealRange: !!enrichedData.idealRange,
        calculationFormula: enrichedData.calculation?.formula,
        idealRangeExcellent: enrichedData.idealRange?.excellent,
      });
      
      setExplanation(enrichedData);
    } catch (err: any) {
      console.error('Failed to load metric explanation:', err);
      toast.error('加载指标说明失败：' + (err.message || '未知错误'));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (!metricName) {
    return null;
  }

  const metricInfo = metricNameMap[metricName] || { displayName: metricName, icon: Info, defaultWeight: 0.25 };
  const MetricIcon = metricInfo.icon;

  const getLevelBadge = (level: 'excellent' | 'good' | 'needsImprovement') => {
    switch (level) {
      case 'excellent':
        return <Badge className="bg-gate-allow text-gate-allow-foreground border-gate-allow-border">优秀</Badge>;
      case 'good':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">良好</Badge>;
      case 'needsImprovement':
        return <Badge className="bg-gate-reject text-gate-reject-foreground border-gate-reject-border">需改进</Badge>;
    }
  };

  const getLevelColor = (level: 'excellent' | 'good' | 'needsImprovement') => {
    switch (level) {
      case 'excellent':
        return 'text-gate-allow-foreground';
      case 'good':
        return 'text-yellow-600';
      case 'needsImprovement':
        return 'text-gate-reject-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MetricIcon className="w-5 h-5" />
            {explanation?.displayName || metricInfo.displayName}
          </DialogTitle>
          <DialogDescription>
            了解此指标的含义、计算方法和当前状态
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : explanation ? (
          <div className="space-y-6">
            {/* 当前状态 */}
            {explanation.currentState && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">当前状态</span>
                  {explanation.currentState.level && getLevelBadge(explanation.currentState.level)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-2xl font-bold', explanation.currentState.level && getLevelColor(explanation.currentState.level))}>
                    {explanation.currentState.score ?? 0}%
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                {explanation.currentState.analysis && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {explanation.currentState.analysis}
                  </p>
                )}
              </div>
            )}

            {/* 定义 */}
            {explanation.definition && (
              <div>
                <h3 className="text-sm font-semibold mb-2">定义</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {explanation.definition}
                </p>
              </div>
            )}

            {/* 计算方法 */}
            {explanation.calculation && (
              <div>
                <h3 className="text-sm font-semibold mb-2">计算方法</h3>
                {explanation.calculation.formula && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <code className="text-sm font-mono">{explanation.calculation.formula}</code>
                  </div>
                )}
                {explanation.calculation.parameters && explanation.calculation.parameters.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">参数说明：</p>
                  {explanation.calculation.parameters.map((param, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      <span className="font-medium">{param.name}</span>
                      {param.value !== undefined && (
                        <span className="ml-2 text-primary">= {param.value}</span>
                      )}
                      <span className="ml-2">：{param.description}</span>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* 理想范围 - 优化后的可视化显示 */}
            {explanation.idealRange && (
              <div>
                <h3 className="text-sm font-semibold mb-3">理想范围</h3>
                
                {/* 🆕 可视化进度条 */}
                <div className="relative mb-4">
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    {/* 渐变背景：从红色到绿色 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gate-reject-foreground via-yellow-500 to-gate-allow-foreground" />
                    
                    {/* 🆕 当前分数指示器 */}
                    {explanation.currentState?.score !== undefined && (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-900 shadow-lg z-10 transition-all duration-300"
                        style={{ left: `${explanation.currentState.score}%` }}
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rounded-full border-2 border-white" />
                      </div>
                    )}
                    
                    {/* 范围分隔线 */}
                    {explanation.idealRange.needsImprovement && (
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-white/60 z-5"
                        style={{ left: `${explanation.idealRange.needsImprovement.max + 1}%` }}
                      />
                    )}
                    {explanation.idealRange.good && (
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-white/60 z-5"
                        style={{ left: `${explanation.idealRange.good.max + 1}%` }}
                      />
                    )}
                  </div>
                  
                  {/* 🆕 当前分数标签 */}
                  {explanation.currentState?.score !== undefined && (
                    <div 
                      className="absolute -top-6 text-xs font-medium text-gray-700 whitespace-nowrap transition-all duration-300"
                      style={{ left: `${Math.min(Math.max(explanation.currentState.score, 5), 95)}%`, transform: 'translateX(-50%)' }}
                    >
                      {explanation.currentState.score}%
                    </div>
                  )}
                </div>
                
                {/* 🆕 优化后的范围列表 - 高亮当前所在范围 */}
                <div className="space-y-2">
                  {explanation.idealRange.excellent && (() => {
                    const currentScore = explanation.currentState?.score ?? 0;
                    const isActive = currentScore >= explanation.idealRange.excellent.min && currentScore <= explanation.idealRange.excellent.max;
                    return (
                      <div className={cn(
                        'flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                        isActive 
                          ? 'bg-gate-allow border-gate-allow-border shadow-sm' 
                          : 'bg-gate-allow/50 border-gate-allow-border'
                      )}>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            isActive ? 'bg-gate-allow-foreground' : 'bg-gate-allow-border'
                          )} />
                          <span className={cn('text-sm font-medium', isActive && 'text-gate-allow-foreground')}>
                            优秀
                          </span>
                          {isActive && (
                            <Badge variant="outline" className="text-xs border-gate-allow-border text-gate-allow-foreground bg-gate-allow">
                              当前
                            </Badge>
                          )}
                        </div>
                        <span className={cn('text-sm font-medium', isActive && 'text-gate-allow-foreground')}>
                          {explanation.idealRange.excellent.min}% - {explanation.idealRange.excellent.max}%
                        </span>
                      </div>
                    );
                  })()}
                  
                  {explanation.idealRange.good && (() => {
                    const currentScore = explanation.currentState?.score ?? 0;
                    const isActive = currentScore >= explanation.idealRange.good.min && currentScore <= explanation.idealRange.good.max;
                    return (
                      <div className={cn(
                        'flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                        isActive 
                          ? 'bg-yellow-50 border-yellow-300 shadow-sm' 
                          : 'bg-yellow-50/50 border-yellow-100'
                      )}>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            isActive ? 'bg-yellow-600' : 'bg-yellow-300'
                          )} />
                          <span className={cn('text-sm font-medium', isActive && 'text-yellow-900')}>
                            良好
                          </span>
                          {isActive && (
                            <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700 bg-yellow-100">
                              当前
                            </Badge>
                          )}
                        </div>
                        <span className={cn('text-sm font-medium', isActive && 'text-yellow-900')}>
                          {explanation.idealRange.good.min}% - {explanation.idealRange.good.max}%
                        </span>
                      </div>
                    );
                  })()}
                  
                  {explanation.idealRange.needsImprovement && (() => {
                    const currentScore = explanation.currentState?.score ?? 0;
                    const isActive = currentScore >= explanation.idealRange.needsImprovement.min && currentScore <= explanation.idealRange.needsImprovement.max;
                    return (
                      <div className={cn(
                        'flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                        isActive 
                          ? 'bg-gate-reject border-gate-reject-border shadow-sm' 
                          : 'bg-gate-reject/50 border-gate-reject-border'
                      )}>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            isActive ? 'bg-gate-reject-foreground' : 'bg-gate-reject-border'
                          )} />
                          <span className={cn('text-sm font-medium', isActive && 'text-gate-reject-foreground')}>
                            需改进
                          </span>
                          {isActive && (
                            <Badge variant="outline" className="text-xs border-gate-reject-border text-gate-reject-foreground bg-gate-reject">
                              当前
                            </Badge>
                          )}
                        </div>
                        <span className={cn('text-sm font-medium', isActive && 'text-gate-reject-foreground')}>
                          {explanation.idealRange.needsImprovement.min}% - {explanation.idealRange.needsImprovement.max}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 权重和贡献 */}
            {(explanation.weight !== undefined || explanation.contribution !== undefined) && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                {explanation.weight !== undefined && (
                  <div>
                    <span className="text-xs text-muted-foreground">权重</span>
                    <p className="text-sm font-medium">{Math.round(explanation.weight * 100)}%</p>
                  </div>
                )}
                {explanation.contribution !== undefined && (
                  <div>
                    <span className="text-xs text-muted-foreground">贡献值</span>
                    <p className="text-sm font-medium">{Math.round(explanation.contribution * 100)}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            暂无说明数据
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
