/**
 * Gate 预检查警告卡片组件
 * 显示 Gate 预检查警告消息和替代方案选择
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GateAlternative {
  id: string;
  label: string;
  description: string;
  action?: string;
  actionParams?: Record<string, any>;
  buttonText?: string;
}

interface GateWarningCardProps {
  warningMessage: string;
  alternatives?: GateAlternative[];
  onSelectAlternative?: (alternative: GateAlternative) => void;
  className?: string;
}

export default function GateWarningCard({
  warningMessage,
  alternatives = [],
  onSelectAlternative,
  className,
}: GateWarningCardProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 警告消息 */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <div className="space-y-2">
            <p>{warningMessage}</p>
            {/* 🆕 P0: Gate 警告原因说明 - 添加了解更多链接 */}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-destructive/80 hover:text-destructive underline">
                了解更多风险评估详情
              </summary>
              <div className="mt-2 p-3 bg-destructive/5 rounded-md text-xs text-slate-700 space-y-2">
                <p>
                  <strong>为什么需要替代方案？</strong>
                </p>
                <p>
                  格陵兰是高风险目的地，需要特殊的旅行经验和准备。我们的安全评估系统检测到您的行程可能存在以下风险：
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>极地环境风险（极端天气、冰川、野生动物）</li>
                  <li>交通可达性限制（偏远地区、季节性限制）</li>
                  <li>救援资源有限（紧急情况响应时间长）</li>
                  <li>体能要求高（需要良好的身体素质和户外经验）</li>
                </ul>
                <p className="mt-2">
                  <strong>建议：</strong>选择中等风险活动或确保您有足够的极地旅行经验。如果您是首次前往极地，我们强烈建议选择有专业向导的团队行程。
                </p>
              </div>
            </details>
          </div>
        </AlertDescription>
      </Alert>

      {/* 替代方案列表 */}
      {alternatives.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">
            推荐替代方案
          </h4>
          <div className="grid gap-3">
            {alternatives.map((alternative) => (
              <Card
                key={alternative.id}
                className="border-gray-200 hover:border-primary transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-slate-900 mb-1">
                        {alternative.label}
                      </h5>
                      {alternative.description && (
                        <p className="text-xs text-muted-foreground">
                          {alternative.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onSelectAlternative?.(alternative)}
                      className="flex-shrink-0"
                    >
                      {alternative.buttonText || '选择此方案'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 如果没有替代方案，显示提示 */}
      {alternatives.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              请根据上述警告信息调整您的行程需求，或联系客服获取帮助。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
