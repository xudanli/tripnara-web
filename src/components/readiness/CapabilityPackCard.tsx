/**
 * 能力包卡片 — 面向用户的准备建议，避免技术术语与重复信息
 */

import { useTranslation } from 'react-i18next';
import { AlertTriangle, ExternalLink, ListChecks } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { CapabilityPackEvaluateResultItem } from '@/api/readiness';
import {
  getPackOneLiner,
  getTriggeredRules,
  humanizeTriggerReason,
  primaryHazardSummary,
  shouldDeferLiveUrgency,
  sortRulesByPriority,
} from '@/lib/capability-pack-display.util';
import type { TripReadinessPhase } from '@/lib/trip-readiness-phase.util';

interface CapabilityPackCardProps {
  result: CapabilityPackEvaluateResultItem;
  displayName: string;
  description?: string;
  readinessPhase?: TripReadinessPhase;
  daysUntilStart?: number;
  addingToChecklist?: boolean;
  onAddToChecklist?: () => void;
  onViewChecklist?: () => void;
}

export default function CapabilityPackCard({
  result,
  displayName,
  description,
  readinessPhase = 'planning',
  daysUntilStart,
  addingToChecklist = false,
  onAddToChecklist,
  onViewChecklist,
}: CapabilityPackCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const triggeredRules = sortRulesByPriority(getTriggeredRules(result));
  const hazardSummary = primaryHazardSummary(result);
  const whyTriggered = humanizeTriggerReason(result.packType, result.triggerReason, lang);
  const oneLiner = getPackOneLiner(result.packType, lang);
  const deferUrgency = shouldDeferLiveUrgency(result.packType, readinessPhase);

  return (
    <Card className="border-primary/40">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-sm">{displayName}</h3>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {t('dashboard.readiness.page.appliesToTrip', { defaultValue: '本行程适用' })}
                </Badge>
              </div>
              <p className="text-sm text-foreground">{oneLiner}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">
              {t('dashboard.readiness.page.whyTriggered', { defaultValue: '为什么出现' })}：
            </span>
            {whyTriggered}
          </p>

          {hazardSummary && (
            <div
              className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-xs ${
                deferUrgency
                  ? 'bg-blue-50 border border-blue-200 text-blue-900'
                  : 'bg-amber-50 border border-amber-200 text-amber-900'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                <span className="font-medium">
                  {deferUrgency
                    ? t('dashboard.readiness.page.planningRiskNote', { defaultValue: '提前了解' })
                    : t('dashboard.readiness.page.mainRisk', { defaultValue: '主要风险' })}
                  ：
                </span>{' '}
                {hazardSummary}
              </span>
            </div>
          )}

          {deferUrgency && daysUntilStart != null && (
            <p className="text-xs text-blue-700 bg-blue-50/60 rounded px-2 py-1.5">
              {t('dashboard.readiness.page.capabilityPackPlanningHint', {
                days: daysUntilStart,
                defaultValue: `距离出发还有 ${daysUntilStart} 天。现在只需提前准备装备和路线意识；具体路况出发前 14 天内再查即可。`,
              })}
            </p>
          )}
        </div>

        {triggeredRules.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t('dashboard.readiness.page.preparationTasks', { defaultValue: '准备事项' })}
            </h4>
            <div className="space-y-1.5">
              {triggeredRules.map((rule, index) => (
                <div
                  key={rule.id ?? index}
                  className={`p-2.5 rounded-md text-xs border ${
                    rule.level === 'blocker'
                      ? 'bg-red-50 border-red-200'
                      : rule.level === 'must'
                        ? 'bg-orange-50 border-orange-200'
                        : rule.level === 'should'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        rule.level === 'blocker'
                          ? 'border-red-500 text-red-700'
                          : rule.level === 'must'
                            ? 'border-orange-500 text-orange-700'
                            : rule.level === 'should'
                              ? 'border-yellow-600 text-yellow-700'
                              : 'border-gray-500 text-gray-700'
                      }`}
                    >
                      {t(`dashboard.readiness.page.ruleLevel.${rule.level}`, {
                        defaultValue: rule.level === 'must' ? '必做' : rule.level === 'should' ? '建议' : rule.level,
                      })}
                    </Badge>
                    <span className="flex-1 leading-relaxed">{rule.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={addingToChecklist || triggeredRules.length === 0}
            onClick={onAddToChecklist}
          >
            {addingToChecklist ? (
              <Spinner className="h-3 w-3 mr-1" />
            ) : (
              <ListChecks className="h-3 w-3 mr-1" />
            )}
            {addingToChecklist
              ? t('dashboard.readiness.page.adding', { defaultValue: '添加中...' })
              : t('dashboard.readiness.page.addRulesToChecklist', { defaultValue: '加入行前准备清单' })}
          </Button>
          {onViewChecklist && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={onViewChecklist}>
              <ExternalLink className="h-3 w-3 mr-1" />
              {t('dashboard.readiness.page.viewChecklist', { defaultValue: '查看行前准备清单' })}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
