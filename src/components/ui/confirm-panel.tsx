/**
 * ConfirmPanel - 确认点清单组件
 * 
 * TripNARA 核心组件：用于 NEED_CONFIRM 流程
 * 
 * 设计原则：
 * - Friction is intentional（摩擦是设计出来的）
 * - 在 NEED_CONFIRM 时，设计必须"有分寸地阻止"用户草率 commit
 * - 确认点清单 + 风险解释 + 用户签收式交互
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { GateStatusBanner } from './gate-status-banner';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';

export interface ConfirmationItem {
  /**
   * 确认项 ID
   */
  id: string;
  /**
   * 确认项标题
   */
  title: string;
  /**
   * 详细说明
   */
  description?: string;
  /**
   * 风险等级
   */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  /**
   * 是否必须确认
   */
  required?: boolean;
  /**
   * 证据链接（可选）
   */
  evidence?: Array<{
    id: string;
    title: string;
    link?: string;
    source?: string;
  }>;
}

export interface ConfirmPanelProps {
  /**
   * 确认项列表
   */
  items: ConfirmationItem[];
  /**
   * 风险解释文本
   */
  riskExplanation?: string;
  /**
   * 标题
   */
  title?: string;
  /**
   * 描述
   */
  description?: string;
  /**
   * 确认按钮文本
   */
  confirmLabel?: string;
  /**
   * 取消按钮文本
   */
  cancelLabel?: string;
  /**
   * 是否禁用确认按钮（直到所有必选项被勾选）
   */
  requireAllChecked?: boolean;
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 确认回调
   */
  onConfirm?: (checkedItems: string[]) => void;
  /**
   * 取消回调
   */
  onCancel?: () => void;
  /**
   * 查看证据回调
   */
  onViewEvidence?: (evidence: ConfirmationItem['evidence']) => void;
}

/**
 * 获取风险等级配置
 */
function getRiskLevelConfig(level?: ConfirmationItem['riskLevel']) {
  switch (level) {
    case 'critical':
      return {
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        label: '严重风险',
      };
    case 'high':
      return {
        icon: AlertTriangle,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        label: '高风险',
      };
    case 'medium':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        label: '中等风险',
      };
    case 'low':
      return {
        icon: CheckCircle2,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        label: '低风险',
      };
    default:
      return null;
  }
}

/**
 * ConfirmPanel 组件
 * 
 * 用于 NEED_CONFIRM 流程，要求用户明确确认所有风险点
 */
export function ConfirmPanel({
  items,
  riskExplanation,
  title = '需要您的确认',
  description = '请仔细阅读以下确认项，确保您理解并接受相关风险',
  confirmLabel = '我已确认并接受',
  cancelLabel = '取消',
  requireAllChecked = true,
  className,
  onConfirm,
  onCancel,
  onViewEvidence,
}: ConfirmPanelProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // 切换确认项
  const toggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  // 检查是否所有必选项都已勾选
  const requiredItems = items.filter(item => item.required !== false);
  const allRequiredChecked = requiredItems.every(item => checkedItems.has(item.id));
  const canConfirm = requireAllChecked ? allRequiredChecked : checkedItems.size > 0;

  // 处理确认
  const handleConfirm = () => {
    if (canConfirm && onConfirm) {
      onConfirm(Array.from(checkedItems));
    }
  };

  return (
    <Card className={cn('border-2 border-gate-confirm-border', className)}>
      <CardHeader className="pb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gate-confirm-foreground" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
          <GateStatusBanner 
            status="NEED_CONFIRM" 
            message="请仔细阅读并确认以下内容"
            size="sm"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 风险解释 */}
        {riskExplanation && (
          <Alert className="bg-gate-confirm/30 border-gate-confirm-border">
            <AlertTriangle className="h-4 w-4 text-gate-confirm-foreground" />
            <AlertDescription className="text-sm">
              <p className="font-medium mb-1">风险说明</p>
              <p>{riskExplanation}</p>
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* 确认项列表 */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">确认清单</Label>
          <div className="space-y-2">
            {items.map((item) => {
              const riskConfig = getRiskLevelConfig(item.riskLevel);
              const isChecked = checkedItems.has(item.id);
              const isRequired = item.required !== false;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border transition-colors',
                    isChecked 
                      ? 'bg-muted/30 border-gate-confirm-border' 
                      : 'bg-background border-border',
                    isRequired && !isChecked && 'border-gate-confirm-border/50'
                  )}
                >
                  <Checkbox
                    id={item.id}
                    checked={isChecked}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Label
                        htmlFor={item.id}
                        className={cn(
                          'text-sm font-medium cursor-pointer',
                          isChecked && 'text-foreground',
                          !isChecked && 'text-muted-foreground'
                        )}
                      >
                        {item.title}
                        {isRequired && (
                          <span className="text-gate-confirm-foreground ml-1">*</span>
                        )}
                      </Label>
                      {riskConfig && (
                        <div className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded text-xs border flex-shrink-0',
                          riskConfig.bg,
                          riskConfig.border
                        )}>
                          <riskConfig.icon className={cn('w-3 h-3', riskConfig.color)} />
                          <span className={riskConfig.color}>{riskConfig.label}</span>
                        </div>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {item.description}
                      </p>
                    )}
                    {item.evidence && item.evidence.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-1 px-2 text-xs"
                          onClick={() => onViewEvidence?.(item.evidence!)}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          查看证据 ({item.evidence.length})
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="min-w-[120px]"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {confirmLabel}
          </Button>
        </div>

        {/* 提示信息 */}
        {requireAllChecked && !allRequiredChecked && (
          <p className="text-xs text-muted-foreground text-center">
            请确认所有必选项（标记为 *）后才能继续
          </p>
        )}
      </CardContent>
    </Card>
  );
}
