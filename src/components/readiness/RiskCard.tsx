import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedRisk } from '@/api/readiness';
import { useTranslation } from 'react-i18next';

interface RiskCardProps {
  risk: EnhancedRisk;
  className?: string;
}

export default function RiskCard({ risk, className }: RiskCardProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh');
  
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

  // 🆕 使用增强字段（如果可用）
  // ✅ 如果后端返回的是英文类型（如 "WEATHER"），尝试转换为中文
  const getTypeLabel = () => {
    if (risk.typeLabel) return risk.typeLabel; // 优先使用后端返回的中文标签
    
    // 如果后端没有返回 typeLabel，尝试从 type 推断中文标签
    const typeToLabel: Record<string, string> = {
      WEATHER: isZh ? '天气风险' : 'Weather Risk',
      TERRAIN: isZh ? '地形风险' : 'Terrain Risk',
      SAFETY: isZh ? '安全风险' : 'Safety Risk',
      LOGISTICS: isZh ? '后勤风险' : 'Logistics Risk',
      WATER: isZh ? '水域风险' : 'Water Risk',
      OTHER: isZh ? '其他风险' : 'Other Risk',
      weather: isZh ? '天气风险' : 'Weather Risk',
      terrain: isZh ? '地形风险' : 'Terrain Risk',
      safety: isZh ? '安全风险' : 'Safety Risk',
      logistics: isZh ? '后勤风险' : 'Logistics Risk',
      water: isZh ? '水域风险' : 'Water Risk',
      other: isZh ? '其他风险' : 'Other Risk',
    };
    
    return typeToLabel[risk.type] || risk.type;
  };
  
  const typeLabel = getTypeLabel();
  const typeIcon = risk.typeIcon || '⚠️';
  const severityLabel = risk.severityLabel || label;
  const description = risk.description || risk.message || risk.summary || '';
  const impact = risk.impact;
  
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
                <p className="text-sm text-muted-foreground">{description}</p>
                {impact && (
                  <p className="text-xs text-muted-foreground mt-1">{impact}</p>
                )}
              </div>
            </div>
          </div>

          {/* 🆕 受影响的POI */}
          {affectedPois.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">
                {isZh ? '影响的POI' : 'Affected POIs'}:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {affectedPois.map((poi, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {isZh && poi.nameCN ? poi.nameCN : poi.name}
                    {poi.day && ` (${isZh ? '第' : 'Day '}${poi.day}${isZh ? '天' : ''})`}
                  </Badge>
                ))}
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

