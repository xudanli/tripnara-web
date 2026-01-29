/**
 * 证据获取建议卡片组件
 * 
 * 符合 TripNARA 设计哲学：
 * - Clarity over Charm（清晰优先于讨喜）
 * - Evidence is the aesthetic（证据就是美学）
 * - Decision is a UI primitive（决策是 UI 原语）
 * 
 * 视觉原则：
 * - 使用设计 Token（gateStatusTokens、cardVariants、typographyTokens）
 * - 克制使用颜色（主靠层级、描边、icon、标签）
 * - 信息层级清晰（一键批量获取 → 建议列表）
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, AlertTriangle, Clock, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gateStatusTokens, cardVariants, typographyTokens } from '@/utils/design-tokens';
import type { EvidenceType } from '@/types/trip';

interface EvidenceSuggestionsCardProps {
  hasMissingEvidence: boolean;
  completenessScore: number; // 0-1
  suggestions: Array<{
    id: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    evidenceTypes: EvidenceType[];
    affectedPoiIds: number[];
    estimatedTime: number; // 秒
    reason: string;
    canBatchFetch: boolean;
  }>;
  bulkFetchSuggestion?: {
    evidenceTypes: EvidenceType[];
    affectedPoiIds: number[];
    estimatedTime: number;
    description: string;
  };
  onFetchEvidence?: (evidenceTypes: EvidenceType[], affectedPoiIds: number[]) => void;
  onBulkFetch?: (evidenceTypes: EvidenceType[], affectedPoiIds: number[]) => void;
  loading?: boolean;
  className?: string;
}

export default function EvidenceSuggestionsCard({
  hasMissingEvidence,
  completenessScore,
  suggestions,
  bulkFetchSuggestion,
  onFetchEvidence,
  onBulkFetch,
  loading = false,
  className,
}: EvidenceSuggestionsCardProps) {
  const { t } = useTranslation();

  // 计算完整性状态
  const getCompletenessStatus = (score: number): 'PASS' | 'WARN' | 'BLOCK' => {
    if (score >= 0.8) return 'PASS';
    if (score >= 0.6) return 'WARN';
    return 'BLOCK';
  };

  const status = getCompletenessStatus(completenessScore);
  const statusConfig = gateStatusTokens[status];

  // 优先级配置
  const priorityConfig = {
    HIGH: { className: 'bg-red-50 text-red-700 border-red-300', icon: AlertCircle },
    MEDIUM: { className: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
    LOW: { className: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle2 },
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes}分钟`;
    return `${minutes}分${remainingSeconds}秒`;
  };

  if (!hasMissingEvidence) {
    return (
      <Card className={cn(cardVariants.standard, className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className={cn('h-5 w-5', gateStatusTokens.PASS.icon)} />
            <CardTitle className="text-base font-semibold">
              {t('dashboard.readiness.evidence.suggestions.title', { defaultValue: '证据获取建议' })}
            </CardTitle>
          </div>
          <CardDescription className="text-xs mt-2">
            {t('dashboard.readiness.evidence.suggestions.noMissing', {
              defaultValue: '所有证据完整，无需获取',
            })}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn(cardVariants.standard, className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className={cn('h-5 w-5', statusConfig.icon)} />
            <CardTitle className="text-base font-semibold">
              {t('dashboard.readiness.evidence.suggestions.title', { defaultValue: '证据获取建议' })}
            </CardTitle>
          </div>
          <Badge variant="outline" className={cn('text-xs font-semibold', statusConfig.border, statusConfig.bg, statusConfig.text)}>
            {Math.round(completenessScore * 100)}%
          </Badge>
        </div>
        <CardDescription className="text-xs mt-2">
          {t('dashboard.readiness.evidence.suggestions.description', {
            defaultValue: '自动检测缺失证据并生成获取建议',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 一键批量获取建议（高优先级） */}
        {bulkFetchSuggestion && onBulkFetch && (
          <div className={cn('p-4 rounded-lg border-2', cardVariants.evidence, 'bg-gradient-to-r from-blue-50 to-amber-50 border-blue-300')}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-foreground">
                    {t('dashboard.readiness.evidence.suggestions.bulkFetch', {
                      defaultValue: '一键批量获取',
                    })}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300">
                    HIGH
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{bulkFetchSuggestion.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(bulkFetchSuggestion.estimatedTime)}</span>
                  </div>
                  <span>•</span>
                  <span>
                    {t('dashboard.readiness.evidence.suggestions.affectedPois', {
                      count: bulkFetchSuggestion.affectedPoiIds.length,
                      defaultValue: '{{count}} 个POI',
                    })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {bulkFetchSuggestion.evidenceTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-[10px] bg-white">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onBulkFetch(bulkFetchSuggestion.evidenceTypes, bulkFetchSuggestion.affectedPoiIds)}
                disabled={loading}
                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Zap className="h-3 w-3 mr-1 animate-spin" />
                    {t('dashboard.readiness.evidence.suggestions.fetching', { defaultValue: '获取中...' })}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('dashboard.readiness.evidence.suggestions.bulkFetchButton', {
                      defaultValue: '一键获取',
                    })}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 建议列表 */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              {t('dashboard.readiness.evidence.suggestions.list', { defaultValue: '获取建议' })}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({suggestions.length})
              </span>
            </h4>
            <div className="space-y-2">
              {suggestions.map((suggestion) => {
                const PriorityIcon = priorityConfig[suggestion.priority].icon;
                return (
                  <div
                    key={suggestion.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      cardVariants.evidence,
                      priorityConfig[suggestion.priority].className
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <PriorityIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">{suggestion.description}</span>
                          <Badge variant="outline" className={cn('text-[10px]', priorityConfig[suggestion.priority].className)}>
                            {suggestion.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestion.evidenceTypes.map((type) => (
                            <Badge key={type} variant="outline" className="text-[10px] bg-white">
                              {type}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(suggestion.estimatedTime)}</span>
                          </div>
                          <span>•</span>
                          <span>
                            {t('dashboard.readiness.evidence.suggestions.affectedPois', {
                              count: suggestion.affectedPoiIds.length,
                              defaultValue: '{{count}} 个POI',
                            })}
                          </span>
                        </div>
                      </div>
                      {onFetchEvidence && suggestion.canBatchFetch && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFetchEvidence(suggestion.evidenceTypes, suggestion.affectedPoiIds)}
                          disabled={loading}
                          className="h-8 text-xs"
                        >
                          {loading ? (
                            <>
                              <Zap className="h-3 w-3 mr-1 animate-spin" />
                              {t('dashboard.readiness.evidence.suggestions.fetching', { defaultValue: '获取中...' })}
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              {t('dashboard.readiness.evidence.suggestions.fetch', { defaultValue: '获取' })}
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
      </CardContent>
    </Card>
  );
}
