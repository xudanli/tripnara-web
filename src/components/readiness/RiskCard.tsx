import { useContext, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, MapPin, ExternalLink, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';
import type { ReadinessPreparationTask } from '@/lib/readiness-preparation-tasks';
import { cn } from '@/lib/utils';
import type { EnhancedRisk } from '@/api/readiness';
import type { TripDetail } from '@/types/trip';
import { useTranslation } from 'react-i18next';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import { jumpFromAffectedPoi } from '@/lib/plan-studio-readiness-jump';
import { mitigationKey, getActionableMitigations } from '@/lib/risk-mitigation-progress';
import {
  isGenericRiskPlaceholder,
  pickRiskBodyText,
  resolveRiskCategoryKey,
  resolveRiskTypeLabel,
  stripItineraryPlaceSuffix,
  isItineraryPlaceOnlyMessage,
} from '@/lib/risk-display.util';

/**
 * GET /readiness/risk-warnings 单卡 UI ↔ 字段（lang=zh 时后端已本地化 typeLabel / severityLabel 等）
 *
 * | 界面           | 字段 |
 * | 卡片标题       | typeLabel（中文）；英文界面优先 typeLabelEn，勿用原始 type 当标题 |
 * | 严重度角标     | severityLabel / severityLabelEn（高·中·低 对应 severity） |
 * | 分类胶囊       | category（weather|terrain|…）→ 前端短文案映射 |
 * | 图标           | typeIcon（emoji）；缺省时可按 category/type 降级 |
 * | 正文           | summary / message；POI 见 affectedPois，不在正文重复 |
 * | 官方来源       | sources[]（authority、title、canonicalUrl…） |
 * | 整包来源       | 见 RiskWarningsResponse.packSources（抽屉层汇总，非单卡） |
 */
interface RiskCardProps {
  risk: EnhancedRisk;
  className?: string;
  /** 规划工作台内用于 affectedPois 跳转某天/某点 */
  trip?: TripDetail | null;
  preparationTasksById?: Map<string, ReadinessPreparationTask>;
  onToggleMitigation?: (taskId: string, completed: boolean) => void;
  onPoiNavigate?: () => void;
  onGoToTasks?: () => void;
}

export default function RiskCard({
  risk,
  className,
  trip,
  preparationTasksById,
  onToggleMitigation,
  onPoiNavigate,
  onGoToTasks,
}: RiskCardProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const planStudio = useContext(PlanStudioContext);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  
  // 🐛 调试日志：检查风险数据是否包含增强字段
  if (process.env.NODE_ENV === 'development') {
    const hasEnhancedFields = !!(risk.typeLabel || risk.typeIcon || risk.severityLabel || risk.category);
    if (!hasEnhancedFields && risk.type) {
      console.log('⚠️ [RiskCard] 风险数据缺少增强字段，使用旧格式:', {
        id: risk.id,
        type: risk.type,
        severity: risk.severity,
        hasTypeLabel: !!risk.typeLabel,
        hasTypeIcon: !!risk.typeIcon,
        hasSeverityLabel: !!risk.severityLabel,
        hasCategory: !!risk.category,
      });
    }
  }

  // 🎨 统一颜色 Token（符合 TripNARA 克制原则）
  const severityConfig = {
    high: {
      label: isZh ? '高' : 'High',
      labelEn: 'High',
      className: 'bg-red-50 text-red-700 border-red-200',
      iconClassName: 'text-red-600',
    },
    medium: {
      label: isZh ? '中' : 'Medium',
      labelEn: 'Medium',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      iconClassName: 'text-amber-600',
    },
    low: {
      label: isZh ? '低' : 'Low',
      labelEn: 'Low',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      iconClassName: 'text-amber-600',
    },
  };

  // ✅ 安全地获取 severity 配置
  const severity = risk.severity && severityConfig[risk.severity] 
    ? risk.severity 
    : 'medium';
  const { label, className: severityClassName, iconClassName } = severityConfig[severity];

  const typeLabel = resolveRiskTypeLabel(risk, isZh);

  const typeIcon = risk.typeIcon || '⚠️';
  const severityLabel = isZh
    ? risk.severityLabel || label
    : risk.severityLabelEn || label;

  const affectedPois = risk.affectedPois || [];
  const rawBodyText = pickRiskBodyText(risk as any);
  const strippedBody =
    affectedPois.length > 0 ? stripItineraryPlaceSuffix(rawBodyText) : rawBodyText;
  const bodyText =
    isItineraryPlaceOnlyMessage(strippedBody) || isItineraryPlaceOnlyMessage(rawBodyText)
      ? ''
      : strippedBody;
  const typeDescription = (risk.typeDescription || '').trim();
  const displayBody =
    bodyText ||
    (typeDescription && !isGenericRiskPlaceholder(typeDescription) ? typeDescription : '');
  const impactOnly = (risk.impact || '').trim();
  const showImpactLine =
    !!impactOnly &&
    !isGenericRiskPlaceholder(impactOnly) &&
    impactOnly !== displayBody &&
    !(displayBody.length > 0 && displayBody.includes(impactOnly));

  const actionableMitigations = useMemo(
    () => getActionableMitigations(risk),
    [risk],
  );

  const mitigationProgress = useMemo(() => {
    if (actionableMitigations.length === 0) {
      return { done: 0, total: 0 };
    }
    const done = actionableMitigations.filter((_, index) =>
      preparationTasksById?.get(mitigationKey(risk, index))?.completed,
    ).length;
    return { done, total: actionableMitigations.length };
  }, [actionableMitigations, preparationTasksById, risk]);

  const priorityConfig = {
    high: { label: isZh ? '高优先级' : 'High', className: 'text-red-600 border-red-200' },
    medium: { label: isZh ? '中优先级' : 'Medium', className: 'text-amber-600 border-amber-200' },
    low: { label: isZh ? '低优先级' : 'Low', className: 'text-slate-600 border-slate-200' },
  };
  
  // 🆕 官方来源
  const sources = risk.sources || [];

  // 🆕 风险分类标签
  const categoryLabels: Record<string, string> = {
    weather: isZh ? '天气' : 'Weather',
    terrain: isZh ? '地形' : 'Terrain',
    safety: isZh ? '安全' : 'Safety',
    logistics: isZh ? '后勤' : 'Logistics',
    other: isZh ? '其他' : 'Other',
  };
  const categoryKey = resolveRiskCategoryKey(risk);
  const categoryLabel = categoryKey ? categoryLabels[categoryKey] || categoryKey : null;

  return (
    <Card className={cn('border', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 风险标题和严重程度 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              {/* 🆕 使用 typeIcon 或默认图标 */}
              {typeIcon && typeIcon !== '⚠️' ? (
                <span className="text-xl flex-shrink-0">{typeIcon}</span>
              ) : (
                <AlertTriangle className={cn('h-5 w-5 flex-shrink-0', iconClassName)} />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-sm">{typeLabel}</h3>
                  <Badge variant="outline" className={cn('text-xs', severityClassName)}>
                    {severityLabel}
                  </Badge>
                  {categoryLabel && (
                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                      {categoryLabel}
                    </Badge>
                  )}
                </div>
                {displayBody ? (
                  <p className="text-sm leading-relaxed text-slate-800">{displayBody}</p>
                ) : null}
                {showImpactLine ? (
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{impactOnly}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* 🆕 受影响的POI */}
          {affectedPois.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">
                {isZh ? '关联行程点' : 'Affected POIs'}:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {affectedPois.map((poi, index) => {
                  const label = `${isZh && poi.nameCN ? poi.nameCN : poi.name}${
                    poi.day ? ` · ${isZh ? '第' : 'Day '}${poi.day}${isZh ? '天' : ''}` : ''
                  }`;
                  const canJump =
                    !!planStudio &&
                    !!trip?.TripDay?.length &&
                    !!poi.day &&
                    !!poi.id;
                  const inner = (
                    <>
                      <MapPin className="w-3 h-3 mr-1 shrink-0" />
                      {label}
                    </>
                  );
                  return canJump ? (
                    <Button
                      key={poi.id || index}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-7 py-1 px-2 text-xs font-normal bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                      title={isZh ? '在时间轴中查看该天/该点' : 'Focus on timeline'}
                      onClick={() => {
                        const ok = jumpFromAffectedPoi(trip!, planStudio!, poi);
                        if (ok) onPoiNavigate?.();
                      }}
                    >
                      {inner}
                    </Button>
                  ) : (
                    <Badge
                      key={poi.id || index}
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-normal py-1 px-2 h-auto"
                    >
                      {inner}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* 缓解措施 → 同步为行前任务 */}
          {actionableMitigations.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  {isZh ? '应对措施' : 'Mitigation'}:
                </h4>
                <div className="flex items-center gap-2">
                  {mitigationProgress.total > 0 ? (
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {isZh
                        ? `${mitigationProgress.done}/${mitigationProgress.total} 已完成`
                        : `${mitigationProgress.done}/${mitigationProgress.total} done`}
                    </span>
                  ) : null}
                  {onGoToTasks ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-slate-600 hover:text-slate-900"
                      onClick={onGoToTasks}
                    >
                      <ListChecks className="w-3 h-3 mr-1" />
                      {isZh ? '行前任务' : 'Tasks'}
                    </Button>
                  ) : null}
                </div>
              </div>
              {mitigationProgress.total > 0 ? (
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.round((mitigationProgress.done / mitigationProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              ) : null}
              <ul className="space-y-1.5">
                {actionableMitigations.map((detail, index) => {
                  const key = mitigationKey(risk, index);
                  const task = preparationTasksById?.get(key);
                  const checked = task?.completed ?? false;
                  const priority = priorityConfig[detail.priority] || priorityConfig.medium;
                  const scopeLabel =
                    task?.scope === 'team'
                      ? isZh
                        ? '团队'
                        : 'Team'
                      : isZh
                        ? '个人'
                        : 'Personal';

                  return (
                    <li key={key}>
                      <div
                        className={cn(
                          'flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors',
                          checked
                            ? 'border-emerald-200 bg-emerald-50/60'
                            : 'border-slate-100 bg-slate-50/40 hover:border-slate-200',
                        )}
                      >
                        <label className="flex flex-1 min-w-0 items-start gap-2 cursor-pointer">
                          <Checkbox
                            id={`risk-mitigation-${key}`}
                            checked={checked}
                            disabled={!onToggleMitigation}
                            onCheckedChange={(value) => {
                              onToggleMitigation?.(key, value === true);
                            }}
                            className="mt-0.5"
                          />
                          <span className="flex-1 min-w-0">
                            <span
                              className={cn(
                                'text-xs leading-relaxed block',
                                checked ? 'text-slate-500 line-through' : 'text-slate-800',
                              )}
                            >
                              {detail.action}
                            </span>
                          </span>
                        </label>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant="outline" className={cn('text-[10px]', priority.className)}>
                            {priority.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-50 text-slate-600 border-slate-200"
                          >
                            {scopeLabel}
                          </Badge>
                          {task?.scope === 'team' && task.assigneeLabel ? (
                            <span className="text-[10px] text-slate-500">
                              {isZh ? '负责人' : 'Owner'} · {task.assigneeLabel}
                            </span>
                          ) : null}
                          {task?.scope === 'team' && !task.assigneeLabel ? (
                            <span className="text-[10px] text-amber-700">
                              {isZh ? '待分配' : 'Unassigned'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {/* 官方来源：默认折叠 */}
          {sources.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-slate-700 py-1 hover:text-slate-900"
                onClick={() => setSourcesOpen((open) => !open)}
                aria-expanded={sourcesOpen}
              >
                <span className="flex items-center gap-1.5">
                  <span>📚</span>
                  <span>{isZh ? '官方来源' : 'Official Sources'}</span>
                  <span className="font-normal text-muted-foreground">({sources.length})</span>
                </span>
                {sourcesOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
              {sourcesOpen && (
                <ul className="space-y-2 mt-2">
                  {sources.map((source, index) => (
                    <li key={source.sourceId || index} className="text-sm text-slate-700">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 mt-1">•</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-slate-900">
                              {source.authority}
                            </span>
                            {source.title && (
                              <span className="text-slate-600">
                                - {source.title}
                              </span>
                            )}
                          </div>
                          {source.canonicalUrl && (
                            <a
                              href={source.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800 hover:underline mt-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{source.canonicalUrl}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

