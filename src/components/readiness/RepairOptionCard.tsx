import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Clock, Zap, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RepairOption } from '@/types/readiness';
import { formatCurrency } from '@/utils/format';

interface RepairOptionCardProps {
  option: RepairOption;
  isSelected?: boolean;
  /** 货币单位（如 "CNY", "USD"） */
  currency?: string;
  onSelect: (optionId: string) => void;
  onApply: (optionId: string) => void;
  onPreview: (optionId: string) => void;
}

// 🎨 统一颜色 Token（符合 TripNARA 克制原则）
const impactColors = {
  high: 'bg-red-50 text-red-700 border-red-200', // ✅ 修复：使用 bg-red-50 而不是 bg-red-100
  medium: 'bg-amber-50 text-amber-700 border-amber-200', // ✅ 修复：使用 bg-amber-50 而不是 bg-yellow-100
  low: 'bg-green-50 text-green-700 border-green-200', // ✅ 修复：使用 bg-green-50 而不是 bg-green-100
};

export default function RepairOptionCard({
  option,
  isSelected = false,
  currency = 'CNY',
  onSelect,
  onApply,
  onPreview,
}: RepairOptionCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer',
        isSelected && 'border-primary border-2 bg-primary/5',
        !isSelected && 'hover:border-primary/50'
      )}
      onClick={() => onSelect(option.id)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">{option.title}</h3>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            {isSelected && (
              <Badge className="bg-primary text-primary-foreground">
                {t('dashboard.readiness.page.recommended', { defaultValue: '推荐' })}
              </Badge>
            )}
          </div>

          {/* 新版：影响程度、耗时、费用 */}
          <div className="flex flex-wrap gap-2 text-xs">
            {option.impact && (
              <Badge variant="outline" className={cn('gap-1', impactColors[option.impact])}>
                <Zap className="h-3 w-3" />
                {t(`dashboard.readiness.page.impact.${option.impact}`, option.impact)}
              </Badge>
            )}
            {option.timeEstimate && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {option.timeEstimate}
              </Badge>
            )}
            {option.cost !== undefined && option.cost > 0 && (
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(option.cost, currency)}
              </Badge>
            )}
          </div>

          {/* 旧版兼容：Before/After 对比 */}
          {option.changes && Object.keys(option.changes).length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {option.changes.time && (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-muted-foreground">
                    {t('dashboard.readiness.page.time', { defaultValue: '时间' })}
                  </span>
                  <span className={cn(
                    'font-medium',
                    option.changes.time.startsWith('+') ? 'text-orange-600' : 'text-green-600'
                  )}>
                    {option.changes.time}
                  </span>
                </div>
              )}
              {option.changes.distance && (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-muted-foreground">
                    {t('dashboard.readiness.page.distance', { defaultValue: '距离' })}
                  </span>
                  <span className={cn(
                    'font-medium',
                    option.changes.distance.startsWith('+') ? 'text-orange-600' : 'text-green-600'
                  )}>
                    {option.changes.distance}
                  </span>
                </div>
              )}
              {option.changes.elevation && (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-muted-foreground">
                    {t('dashboard.readiness.page.elevation', { defaultValue: '爬升' })}
                  </span>
                  <span className={cn(
                    'font-medium',
                    option.changes.elevation.startsWith('+') ? 'text-orange-600' : 'text-green-600'
                  )}>
                    {option.changes.elevation}
                  </span>
                </div>
              )}
              {option.changes.risk && (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-muted-foreground">
                    {t('dashboard.readiness.page.riskLevel', { defaultValue: '风险' })}
                  </span>
                  <span className={cn(
                    'font-medium',
                    option.changes.risk === '下降' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {option.changes.risk}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Why this fix (可展开) - 旧版兼容 */}
          {option.reasonCode && (
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {t('dashboard.readiness.page.whyThisFix', { defaultValue: '为什么选择此方案' })}
                {expanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              {expanded && (
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <div className="font-medium mb-1">
                    {t('dashboard.readiness.page.reasonCode', { defaultValue: '原因代码' })}: {option.reasonCode}
                  </div>
                  {option.evidenceLink && (
                    <a
                      href={option.evidenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {t('dashboard.readiness.page.viewEvidence', { defaultValue: '查看证据' })}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          {isSelected && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(option.id);
                }}
              >
                {t('dashboard.readiness.page.applyFix', { defaultValue: '应用修复' })}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(option.id);
                }}
              >
                {t('dashboard.readiness.page.preview', { defaultValue: '预览' })}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
