import { useContext } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedRisk } from '@/api/readiness';
import type { TripDetail } from '@/types/trip';
import { useTranslation } from 'react-i18next';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import { jumpFromAffectedPoi } from '@/lib/plan-studio-readiness-jump';

/**
 * GET /readiness/risk-warnings 单卡 UI ↔ 字段（lang=zh 时后端已本地化 typeLabel / severityLabel 等）
 *
 * | 界面           | 字段 |
 * | 卡片标题       | typeLabel（中文）；英文界面优先 typeLabelEn，勿用原始 type 当标题 |
 * | 严重度角标     | severityLabel / severityLabelEn（高·中·低 对应 severity） |
 * | 分类胶囊       | category（weather|terrain|…）→ 前端短文案映射 |
 * | 图标           | typeIcon（emoji）；缺省时可按 category/type 降级 |
 * | 正文           | summary / message（已含行程后缀）；无则再 description / impact |
 * | 官方来源       | sources[]（authority、title、canonicalUrl…） |
 * | 整包来源       | 见 RiskWarningsResponse.packSources（抽屉层汇总，非单卡） |
 */
interface RiskCardProps {
  risk: EnhancedRisk;
  className?: string;
  /** 规划工作台内用于 affectedPois 跳转某天/某点 */
  trip?: TripDetail | null;
}

export default function RiskCard({ risk, className, trip }: RiskCardProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const planStudio = useContext(PlanStudioContext);
  
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

  const typeToLabelFallback: Record<string, { zh: string; en: string }> = {
    WEATHER: { zh: '天气风险', en: 'Weather risk' },
    TERRAIN: { zh: '地形风险', en: 'Terrain risk' },
    SAFETY: { zh: '安全风险', en: 'Safety risk' },
    LOGISTICS: { zh: '后勤风险', en: 'Logistics risk' },
    WATER: { zh: '水域风险', en: 'Water risk' },
    OTHER: { zh: '其他风险', en: 'Other risk' },
    weather: { zh: '天气风险', en: 'Weather risk' },
    terrain: { zh: '地形风险', en: 'Terrain risk' },
    safety: { zh: '安全风险', en: 'Safety risk' },
    logistics: { zh: '后勤风险', en: 'Logistics risk' },
    water: { zh: '水域风险', en: 'Water risk' },
    other: { zh: '其他风险', en: 'Other risk' },
  };

  /** 标题：禁止把原始 type 直接当标题；中文 typeLabel，英文 typeLabelEn */
  const typeLabel = isZh
    ? risk.typeLabel ||
      (risk.type ? typeToLabelFallback[risk.type]?.zh : undefined) ||
      risk.typeLabelEn ||
      risk.type ||
      ''
    : risk.typeLabelEn ||
      (risk.type ? typeToLabelFallback[risk.type]?.en : undefined) ||
      risk.typeLabel ||
      risk.type ||
      '';

  const typeIcon = risk.typeIcon || '⚠️';
  const severityLabel = isZh
    ? risk.severityLabel || label
    : risk.severityLabelEn || label;

  /** 主文案：summary / message（后端已带行程后缀）；缺省时再 description / impact */
  const bodyText =
    (risk.summary || risk.message || '').trim() ||
    (risk.description || '').trim() ||
    (risk.impact || '').trim();
  const impactOnly = (risk.impact || '').trim();
  const showImpactLine =
    !!impactOnly && impactOnly !== bodyText && !(bodyText.length > 0 && bodyText.includes(impactOnly));
  
  // 🆕 优先使用 mitigationDetails（包含优先级），否则使用 mitigation
  const mitigationDetails = risk.mitigationDetails || [];
  const mitigations = risk.mitigation || risk.mitigations || [];
  const hasMitigationDetails = mitigationDetails.length > 0;
  
  // 🆕 受影响的POI
  const affectedPois = risk.affectedPois || [];

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
  const categoryLabel = risk.category ? categoryLabels[risk.category] || risk.category : null;

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
                {bodyText ? (
                  <p className="text-sm text-muted-foreground">{bodyText}</p>
                ) : null}
                {showImpactLine ? (
                  <p className="text-xs text-muted-foreground mt-1">{impactOnly}</p>
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
                      onClick={() => jumpFromAffectedPoi(trip!, planStudio!, poi)}
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
          
          {/* 🆕 缓解措施（优先显示带优先级的详细建议） */}
          {hasMitigationDetails ? (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                {isZh ? '应对措施' : 'Mitigation'}:
              </h4>
              <ul className="space-y-1.5">
                {mitigationDetails.map((detail, index) => {
                  const priorityConfig = {
                    high: { label: isZh ? '高优先级' : 'High', className: 'text-red-600' },
                    medium: { label: isZh ? '中优先级' : 'Medium', className: 'text-amber-600' },
                    low: { label: isZh ? '低优先级' : 'Low', className: 'text-slate-600' },
                  };
                  const priority = priorityConfig[detail.priority] || priorityConfig.medium;
                  
                  return (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-muted-foreground/50 mt-1">•</span>
                      <span className="flex-1">{detail.action}</span>
                      <Badge variant="outline" className={cn('text-xs', priority.className)}>
                        {priority.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : mitigations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                {isZh ? '应对措施' : 'Mitigation'}:
              </h4>
              <ul className="space-y-1">
                {mitigations.map((mitigation, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground/50 mt-1">•</span>
                    <span>{mitigation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 🆕 官方来源 */}
          {sources.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span>📚</span>
                <span>{isZh ? '官方来源' : 'Official Sources'}:</span>
              </h4>
              <ul className="space-y-1.5">
                {sources.map((source, index) => (
                  <li key={source.sourceId || index} className="text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground/50 mt-1">•</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-foreground">
                            {source.authority}
                          </span>
                          {source.title && (
                            <span className="text-muted-foreground">
                              - {source.title}
                            </span>
                          )}
                        </div>
                        {source.canonicalUrl && (
                          <a
                            href={source.canonicalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{source.canonicalUrl}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

