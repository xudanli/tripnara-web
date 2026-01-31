/**
 * 安全警告卡片组件
 * 显示安全第一原则的警告信息和替代方案
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import GateWarningCard, { type GateAlternative } from './GateWarningCard';

interface SafetyWarningCardProps {
  warningMessage: string;
  alternatives?: GateAlternative[];
  personaName?: string;
  onAlternativeSelect?: (alternative: GateAlternative) => void;
  onContinue?: () => void;
  className?: string;
}

export default function SafetyWarningCard({
  warningMessage,
  alternatives = [],
  personaName,
  onAlternativeSelect,
  onContinue,
  className,
}: SafetyWarningCardProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 警告消息 */}
      <Alert variant="destructive" className="border-orange-300 bg-orange-50">
        <Shield className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-orange-900">安全提醒</p>
            {personaName && (
              <p className="text-orange-800">
                根据您的画像（{personaName}），您选择的活动可能不适合。为了您的安全，我们强烈建议您重新考虑。
              </p>
            )}
            {warningMessage && (
              <p className="text-orange-800">{warningMessage}</p>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* 替代方案 */}
      {alternatives.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">
            建议替代方案：
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
                    {onAlternativeSelect && (
                      <Button
                        size="sm"
                        onClick={() => onAlternativeSelect(alternative)}
                        className="flex-shrink-0"
                      >
                        {alternative.buttonText || '选择此方案'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 继续按钮（不推荐） */}
      {onContinue && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // 二次确认
              if (window.confirm('您确定要继续吗？这可能会带来安全风险。')) {
                onContinue();
              }
            }}
            className="text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            继续（不推荐）
          </Button>
        </div>
      )}
    </div>
  );
}
