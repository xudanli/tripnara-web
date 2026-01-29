import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoreBreakdownResponse, ReadinessCheckResult } from '@/api/readiness';
import { gateStatusTokens as designTokens, typographyTokens, spacingTokens } from '@/utils/design-tokens';

type GateStatus = 'BLOCK' | 'WARN' | 'PASS';

interface ReadinessDrawerHeaderProps {
  scoreBreakdown: ScoreBreakdownResponse | null;
  gateStatus: GateStatus;
  readinessResult: ReadinessCheckResult | null;
}

// GateStatus 视觉 Token（使用统一设计 Token）
const gateStatusTokens = {
  BLOCK: {
    ...designTokens.BLOCK,
    icon: AlertCircle,
  },
  WARN: {
    ...designTokens.WARN,
    icon: AlertTriangle,
  },
  PASS: {
    ...designTokens.PASS,
    icon: CheckCircle2,
  },
};

export default function ReadinessDrawerHeader({
  scoreBreakdown,
  gateStatus,
  readinessResult,
}: ReadinessDrawerHeaderProps) {
  const { t } = useTranslation();
  
  const StatusIcon = gateStatusTokens[gateStatus].icon;
  const statusLabel = gateStatus === 'BLOCK'
    ? t('dashboard.readiness.page.drawer.status.block')
    : gateStatus === 'WARN'
    ? t('dashboard.readiness.page.drawer.status.warn')
    : t('dashboard.readiness.page.drawer.status.pass');

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-white">
      {/* 层级1：核心状态（最高优先级） */}
      <div className={cn(spacingTokens.drawerPadding, spacingTokens.drawerPaddingTop, spacingTokens.drawerPaddingBottomSmall)}>
        <div className="flex items-center gap-3">
          {/* 分数圆圈 */}
          {scoreBreakdown?.score?.overall !== undefined && (
            <div className={cn(
              'flex-shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center border-2',
              scoreBreakdown.score.overall < 60 
                ? 'border-red-600 bg-red-50 text-red-700'
                : scoreBreakdown.score.overall < 80
                ? 'border-amber-600 bg-amber-50 text-amber-700'
                : 'border-green-600 bg-green-50 text-green-700'
            )}>
              <span className={typographyTokens.score}>{scoreBreakdown.score.overall}</span>
              <span className={typographyTokens.scoreDenominator}>/100</span>
            </div>
          )}
          
          {/* 状态标签 */}
          <div className="flex-1">
            <Badge
              variant="outline"
              className={cn(
                'w-full justify-center py-2 text-sm font-semibold',
                gateStatusTokens[gateStatus].border,
                gateStatusTokens[gateStatus].bg,
                gateStatusTokens[gateStatus].text
              )}
            >
              <StatusIcon className={cn('mr-2 h-4 w-4', gateStatusTokens[gateStatus].iconColor)} />
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* 层级2：关键统计（次要优先级） */}
      {/* ✅ 显示4个状态：阻塞、必须、建议、风险 */}
      {(() => {
        // 计算统计数据
        const blockers = scoreBreakdown?.summary?.blockers ?? readinessResult?.summary?.totalBlockers ?? 0;
        // ✅ 统一状态映射：使用 must 字段，兼容 warnings
        const must = scoreBreakdown?.summary?.must ?? scoreBreakdown?.summary?.warnings ?? readinessResult?.summary?.totalMust ?? 0;
        // ✅ 统一状态映射：使用 should 字段，兼容 suggestions
        const should = scoreBreakdown?.summary?.should ?? scoreBreakdown?.summary?.suggestions ?? readinessResult?.summary?.totalShould ?? 0;
        // ✅ 计算风险数量：从 readinessResult.risks 或 scoreBreakdown.risks
        const risks = readinessResult?.risks?.length ?? 
                      readinessResult?.findings?.reduce((sum, f) => sum + (f.risks?.length || 0), 0) ??
                      scoreBreakdown?.risks?.length ?? 
                      readinessResult?.summary?.totalRisks ?? 0;

        return (
          <div className={cn(spacingTokens.drawerPadding, spacingTokens.drawerPaddingBottomSmall)}>
            <div className="mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('dashboard.readiness.page.drawer.stats.title', '有待处理的事项')}
              </h3>
            </div>
            <div className={cn('grid grid-cols-2 gap-2 text-center')}>
              {/* 阻塞项 */}
              <div className={cn(
                'p-2 rounded-lg border',
                blockers > 0 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : 'bg-white border-gray-200 text-gray-600'
              )}>
                <div className={cn(
                  typographyTokens.statNumber,
                  blockers > 0 && 'font-bold text-lg'
                )}>
                  {blockers}
                </div>
                <div className={cn(typographyTokens.statLabel, 'mt-0.5', blockers > 0 && 'font-medium')}>
                  {t('dashboard.readiness.page.blockers', '阻塞')}
                </div>
              </div>
              
              {/* 必须项 */}
              <div className={cn(
                'p-2 rounded-lg border',
                must > 0 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-white border-gray-200 text-gray-600'
              )}>
                <div className={cn(
                  typographyTokens.statNumber,
                  must > 0 && 'font-semibold'
                )}>
                  {must}
                </div>
                <div className={cn(typographyTokens.statLabel, 'mt-0.5')}>
                  {t('dashboard.readiness.page.must', '必须')}
                </div>
              </div>
              
              {/* 建议项 */}
              <div className={cn(
                'p-2 rounded-lg border',
                should > 0 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600'
              )}>
                <div className={cn(
                  typographyTokens.statNumber,
                  should > 0 && 'font-semibold'
                )}>
                  {should}
                </div>
                <div className={cn(typographyTokens.statLabel, 'mt-0.5')}>
                  {t('dashboard.readiness.page.should', '建议')}
                </div>
              </div>
              
              {/* 风险项 */}
              <div className={cn(
                'p-2 rounded-lg border',
                risks > 0 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : 'bg-white border-gray-200 text-gray-600'
              )}>
                <div className={cn(
                  typographyTokens.statNumber,
                  risks > 0 && 'font-semibold'
                )}>
                  {risks}
                </div>
                <div className={cn(typographyTokens.statLabel, 'mt-0.5')}>
                  {t('dashboard.readiness.page.risks', '风险')}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
