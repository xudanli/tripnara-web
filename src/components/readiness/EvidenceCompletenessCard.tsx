/**
 * 证据完整性检查卡片组件
 * 
 * 符合 TripNARA 设计哲学：
 * - Clarity over Charm（清晰优先于讨喜）
 * - Evidence is the aesthetic（证据就是美学）
 * - Decision is a UI primitive（决策是 UI 原语）
 * 
 * 视觉原则：
 * - 使用设计 Token（gateStatusTokens、cardVariants、typographyTokens）
 * - 克制使用颜色（主靠层级、描边、icon、标签）
 * - 信息层级清晰（完整性评分 → 缺失证据 → 补充建议）
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gateStatusTokens, cardVariants } from '@/utils/design-tokens';
import type { EvidenceType } from '@/types/trip';

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  opening_hours: '营业时间',
  weather: '天气',
  road_closure: '道路状况',
  booking: '预订确认',
  other: '其他',
};

interface EvidenceCompletenessCardProps {
  completenessScore: number; // 0-1
  missingEvidence: Array<{
    poiId: number;
    poiName: string;
    missingTypes: EvidenceType[];
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    estimatedTime: number; // 秒
    evidenceTypes: EvidenceType[];
    affectedPois: number[];
  }>;
  onFetchEvidence?: (evidenceTypes: EvidenceType[], affectedPois: number[]) => void;
  loading?: boolean;
  className?: string;
  readinessPhase?: 'planning' | 'pre_departure' | 'in_trip' | 'past';
  phaseHint?: string;
  deferredEvidenceCount?: number;
}

export default function EvidenceCompletenessCard({
  completenessScore,
  missingEvidence,
  recommendations,
  onFetchEvidence,
  loading = false,
  className,
  readinessPhase,
  phaseHint,
  deferredEvidenceCount,
}: EvidenceCompletenessCardProps) {
  const { t } = useTranslation();

  // 计算完整性状态
  const getCompletenessStatus = (score: number): 'PASS' | 'WARN' | 'BLOCK' => {
    if (score >= 0.8) return 'PASS';
    if (score >= 0.6) return 'WARN';
    return 'BLOCK';
  };

  const status = getCompletenessStatus(completenessScore);
  const statusConfig = gateStatusTokens[status];
  const StatusIcon = status === 'PASS' ? CheckCircle2 : status === 'WARN' ? AlertTriangle : AlertCircle;

  // 影响等级配置
  const impactConfig = {
    HIGH: { icon: AlertCircle, className: 'text-error', bg: 'bg-muted', border: 'border-border' },
    MEDIUM: { icon: AlertTriangle, className: 'text-warning', bg: 'bg-muted', border: 'border-border' },
    LOW: { icon: CheckCircle2, className: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
  };

  // 优先级配置
  const priorityConfig = {
    HIGH: { className: 'bg-muted text-error border-border', icon: AlertCircle },
    MEDIUM: { className: 'bg-muted text-warning border-border', icon: AlertTriangle },
    LOW: { className: 'bg-muted text-muted-foreground border-border', icon: CheckCircle2 },
  };

  return (
    <Card className={cn(cardVariants.standard, className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn('h-5 w-5', statusConfig.icon)} />
            <CardTitle className="text-base font-semibold">
              {t('dashboard.readiness.evidence.completeness.title', { defaultValue: '证据完整性检查' })}
            </CardTitle>
          </div>
          <Badge variant="outline" className={cn('text-xs font-semibold', statusConfig.border, statusConfig.bg, statusConfig.text)}>
            {Math.round(completenessScore * 100)}%
          </Badge>
        </div>
        <CardDescription className="text-xs mt-2">
          {t('dashboard.readiness.evidence.completeness.description', {
            defaultValue: '检查行程中所有POI的期望证据类型，识别缺失的证据',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(readinessPhase === 'planning' || readinessPhase === 'in_trip') && phaseHint && (
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-xs',
              readinessPhase === 'in_trip'
                ? 'border-border bg-muted text-muted-foreground'
                : 'border-border bg-muted text-muted-foreground',
            )}
          >
            {phaseHint}
            {readinessPhase === 'planning' && deferredEvidenceCount != null && deferredEvidenceCount > 0 && (
              <span className="ml-1 text-muted-foreground">
                （{deferredEvidenceCount} 项实时证据将在出发前 14 天内检查）
              </span>
            )}
          </div>
        )}

        {/* 完整性评分进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t('dashboard.readiness.evidence.completeness.score', { defaultValue: '完整性评分' })}
            </span>
            <span className={cn('font-semibold', statusConfig.text)}>
              {Math.round(completenessScore * 100)}%
            </span>
          </div>
          <Progress 
            value={completenessScore * 100} 
            className={cn(
              'h-2',
              status === 'PASS' && 'bg-muted',
              status === 'WARN' && 'bg-muted',
              status === 'BLOCK' && 'bg-muted'
            )}
          />
        </div>

        {/* 缺失证据列表 */}
        {missingEvidence.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              {t('dashboard.readiness.evidence.completeness.missingEvidence', { defaultValue: '缺失证据' })}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({missingEvidence.length})
              </span>
            </h4>
            <div className="space-y-2">
              {missingEvidence.map((item, index) => {
                const ImpactIcon = impactConfig[item.impact].icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg border',
                      impactConfig[item.impact].bg,
                      impactConfig[item.impact].border
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <ImpactIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', impactConfig[item.impact].className)} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.poiName}</span>
                          <Badge variant="outline" className={cn('text-[10px]', impactConfig[item.impact].className)}>
                            {item.impact}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.missingTypes.map((type) => (
                            <Badge key={type} variant="outline" className="text-[10px] bg-white">
                              {EVIDENCE_TYPE_LABELS[type] ?? type}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 补充建议 */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              {t('dashboard.readiness.evidence.completeness.recommendations', { defaultValue: '补充建议' })}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({recommendations.length})
              </span>
            </h4>
            <div className="space-y-2">
              {recommendations.map((rec, index) => {
                const PriorityIcon = priorityConfig[rec.priority].icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg border',
                      cardVariants.evidence,
                      priorityConfig[rec.priority].className
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <PriorityIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">{rec.action}</span>
                          <Badge variant="outline" className={cn('text-[10px]', priorityConfig[rec.priority].className)}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.evidenceTypes.map((type) => (
                            <Badge key={type} variant="outline" className="text-[10px] bg-white">
                              {EVIDENCE_TYPE_LABELS[type] ?? type}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{rec.estimatedTime}秒</span>
                          </div>
                          <span>•</span>
                          <span>
                            {t('dashboard.readiness.evidence.completeness.affectedPois', {
                              count: rec.affectedPois.length,
                              defaultValue: '{{count}} 个POI',
                            })}
                          </span>
                        </div>
                      </div>
                      {onFetchEvidence && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFetchEvidence(rec.evidenceTypes, rec.affectedPois)}
                          disabled={loading}
                          className="h-8 text-xs"
                        >
                          {loading ? (
                            <>
                              <Zap className="h-3 w-3 mr-1 animate-spin" />
                              {t('dashboard.readiness.evidence.completeness.fetching', { defaultValue: '获取中...' })}
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              {t('dashboard.readiness.evidence.completeness.fetch', { defaultValue: '获取' })}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 无缺失证据 */}
        {missingEvidence.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-sm">
              {t('dashboard.readiness.evidence.completeness.noMissing', {
                defaultValue: '所有证据完整，无需补充',
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
