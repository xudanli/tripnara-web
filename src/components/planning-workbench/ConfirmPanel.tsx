/**
 * ConfirmPanel 组件
 * 
 * 用于 NEED_CONFIRM 状态的"阻断式确认"设计
 * 符合 TripNARA 的 "Friction is intentional" 设计原则
 * 
 * 功能：
 * - 显示确认点清单
 * - 显示风险解释
 * - 用户签收式交互
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmPanelProps {
  /**
   * 需要确认的事项列表
   * 通常来自 Abu persona 的 confirmations
   */
  confirmations: string[];
  
  /**
   * 风险解释
   * 通常来自综合决策的 summary 或 nextSteps
   */
  riskExplanation?: string;
  
  /**
   * 决策状态
   */
  decisionStatus: 'NEED_CONFIRM' | 'SUGGEST_REPLACE' | 'REJECT' | 'ALLOW';
  
  /**
   * 是否已全部确认
   */
  onConfirmChange?: (allConfirmed: boolean) => void;
  
  /**
   * 自定义样式
   */
  className?: string;
}

export default function ConfirmPanel({
  confirmations,
  riskExplanation,
  decisionStatus,
  onConfirmChange,
  className,
}: ConfirmPanelProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const handleCheckChange = (index: number, checked: boolean) => {
    const newChecked = new Set(checkedItems);
    if (checked) {
      newChecked.add(index);
    } else {
      newChecked.delete(index);
    }
    setCheckedItems(newChecked);
    
    // 通知父组件是否全部确认
    if (onConfirmChange) {
      onConfirmChange(newChecked.size === confirmations.length);
    }
  };

  const allConfirmed = checkedItems.size === confirmations.length && confirmations.length > 0;

  // 根据决策状态选择图标和颜色
  const getStatusConfig = () => {
    switch (decisionStatus) {
      case 'NEED_CONFIRM':
        return {
          icon: AlertCircle,
          iconColor: 'text-gate-confirm-foreground',
          bgColor: 'bg-gate-confirm',
          borderColor: 'border-gate-confirm-border',
          title: '需要确认',
          description: '请仔细阅读以下确认点，确保您理解并接受相关风险',
        };
      case 'SUGGEST_REPLACE':
        return {
          icon: AlertTriangle,
          iconColor: 'text-gate-suggest-foreground',
          bgColor: 'bg-gate-suggest',
          borderColor: 'border-gate-suggest-border',
          title: '建议替换',
          description: '系统建议您考虑以下替代方案，请确认是否接受',
        };
      case 'REJECT':
        return {
          icon: Shield,
          iconColor: 'text-gate-reject-foreground',
          bgColor: 'bg-gate-reject',
          borderColor: 'border-gate-reject-border',
          title: '拒绝执行',
          description: '此方案存在严重风险，不建议执行。请查看替代方案',
        };
      default:
        return {
          icon: AlertCircle,
          iconColor: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-border',
          title: '确认',
          description: '请确认以下事项',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={cn('border-2', statusConfig.borderColor, className)}>
      <CardHeader className={cn('pb-3', statusConfig.bgColor)}>
        <div className="flex items-start gap-3">
          <StatusIcon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', statusConfig.iconColor)} />
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{statusConfig.title}</CardTitle>
            <CardDescription className="mt-1">
              {statusConfig.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* 风险解释 */}
        {riskExplanation && (
          <div className="p-3 bg-muted rounded-lg border">
            <p className="text-sm text-foreground leading-relaxed">{riskExplanation}</p>
          </div>
        )}

        {/* 确认点清单 */}
        {confirmations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">确认点清单</h4>
            <div className="space-y-3">
              {confirmations.map((confirmation, index) => {
                const isChecked = checkedItems.has(index);
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                      isChecked
                        ? 'bg-muted border-primary/20'
                        : 'bg-background border-border hover:bg-muted/50'
                    )}
                  >
                    <Checkbox
                      id={`confirm-${index}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => handleCheckChange(index, checked as boolean)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`confirm-${index}`}
                      className="flex-1 text-sm text-foreground leading-relaxed cursor-pointer"
                    >
                      {confirmation}
                    </label>
                  </div>
                );
              })}
            </div>
            
            {/* 确认状态提示 */}
            {allConfirmed && (
              <div className="p-3 bg-gate-allow/10 border border-gate-allow-border rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gate-allow-foreground" />
                  <p className="text-sm text-gate-allow-foreground">
                    已确认所有确认点，可以继续提交方案
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 如果没有确认点，显示提示 */}
        {confirmations.length === 0 && (
          <div className="p-3 bg-muted rounded-lg border">
            <p className="text-sm text-muted-foreground">
              当前方案需要您的确认。请仔细阅读综合决策和三人格评估结果。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
