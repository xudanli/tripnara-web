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

// 指标名称映射
const metricNameMap: Record<string, { displayName: string; icon: typeof CheckCircle2 }> = {
  schedule: { displayName: '时间灵活性', icon: CheckCircle2 },
  budget: { displayName: '预算控制', icon: TrendingUp },
  pace: { displayName: '节奏合理性', icon: AlertTriangle },
  feasibility: { displayName: '可达性', icon: XCircle },
};

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
      setExplanation(data);
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

  const metricInfo = metricNameMap[metricName] || { displayName: metricName, icon: Info };
  const MetricIcon = metricInfo.icon;

  const getLevelBadge = (level: 'excellent' | 'good' | 'needsImprovement') => {
    switch (level) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-800 border-green-200">优秀</Badge>;
      case 'good':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">良好</Badge>;
      case 'needsImprovement':
        return <Badge className="bg-red-100 text-red-800 border-red-200">需改进</Badge>;
    }
  };

  const getLevelColor = (level: 'excellent' | 'good' | 'needsImprovement') => {
    switch (level) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-yellow-600';
      case 'needsImprovement':
        return 'text-red-600';
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
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">当前状态</span>
                {getLevelBadge(explanation.currentState.level)}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-2xl font-bold', getLevelColor(explanation.currentState.level))}>
                  {explanation.currentState.score}%
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {explanation.currentState.analysis}
              </p>
            </div>

            {/* 定义 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">定义</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {explanation.definition}
              </p>
            </div>

            {/* 计算方法 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">计算方法</h3>
              <div className="p-3 bg-muted/50 rounded-lg">
                <code className="text-sm font-mono">{explanation.calculation.formula}</code>
              </div>
              {explanation.calculation.parameters.length > 0 && (
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

            {/* 理想范围 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">理想范围</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">优秀</span>
                  <span className="text-sm font-medium">
                    {explanation.idealRange.excellent.min}% - {explanation.idealRange.excellent.max}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <span className="text-sm">良好</span>
                  <span className="text-sm font-medium">
                    {explanation.idealRange.good.min}% - {explanation.idealRange.good.max}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="text-sm">需改进</span>
                  <span className="text-sm font-medium">
                    {explanation.idealRange.needsImprovement.min}% - {explanation.idealRange.needsImprovement.max}%
                  </span>
                </div>
              </div>
            </div>

            {/* 权重和贡献 */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <span className="text-xs text-muted-foreground">权重</span>
                <p className="text-sm font-medium">{Math.round(explanation.weight * 100)}%</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">贡献值</span>
                <p className="text-sm font-medium">{Math.round(explanation.contribution)}</p>
              </div>
            </div>
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
