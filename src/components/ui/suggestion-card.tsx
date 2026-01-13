/**
 * SuggestionCard - 建议卡组件
 * 
 * TripNARA 核心组件：用于显示三人格的建议
 * 包含：结论/影响/动作/证据
 * 
 * 设计原则：
 * - 清晰优先于讨喜
 * - 证据就是美学
 * - 决策是 UI 原语
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Suggestion, SuggestionAction, EvidenceLink } from '@/types/suggestion';
import { 
  Shield, 
  Activity, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';

export interface SuggestionCardProps {
  /**
   * 建议数据
   */
  suggestion: Suggestion;
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 是否紧凑模式
   */
  compact?: boolean;
  /**
   * 是否显示证据（默认 true）
   */
  showEvidence?: boolean;
  /**
   * 操作按钮点击回调
   */
  onAction?: (action: SuggestionAction) => void;
  /**
   * 查看证据回调
   */
  onViewEvidence?: (evidence: EvidenceLink[]) => void;
}

/**
 * 获取三人格图标
 */
function getPersonaIcon(persona: Suggestion['persona']) {
  switch (persona) {
    case 'abu':
      return Shield;
    case 'drdre':
      return Activity;
    case 'neptune':
      return RefreshCw;
    default:
      return Info;
  }
}

/**
 * 获取三人格颜色类名
 */
function getPersonaColorClasses(persona: Suggestion['persona']) {
  switch (persona) {
    case 'abu':
      return 'bg-persona-abu/10 border-persona-abu-accent/30 text-persona-abu-foreground';
    case 'drdre':
      return 'bg-persona-dre/10 border-persona-dre-accent/30 text-persona-dre-foreground';
    case 'neptune':
      return 'bg-persona-neptune/10 border-persona-neptune-accent/30 text-persona-neptune-foreground';
    default:
      return 'bg-muted/50 border-border text-foreground';
  }
}

/**
 * 获取严重程度图标和颜色
 */
function getSeverityConfig(severity: Suggestion['severity']) {
  switch (severity) {
    case 'blocker':
      return {
        icon: AlertTriangle,
        badge: 'bg-red-100 text-red-800 border-red-200',
        label: '阻塞',
      };
    case 'warn':
      return {
        icon: AlertTriangle,
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: '警告',
      };
    case 'info':
      return {
        icon: Info,
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        label: '信息',
      };
    default:
      return {
        icon: Info,
        badge: 'bg-gray-100 text-gray-800 border-gray-200',
        label: severity,
      };
  }
}

/**
 * SuggestionCard 组件
 * 
 * 用于显示三人格的建议，包含结论、影响、动作和证据
 */
export function SuggestionCard({
  suggestion,
  className,
  compact = false,
  showEvidence = true,
  onAction,
  onViewEvidence,
}: SuggestionCardProps) {
  const PersonaIcon = getPersonaIcon(suggestion.persona);
  const personaColors = getPersonaColorClasses(suggestion.persona);
  const severityConfig = getSeverityConfig(suggestion.severity);
  const SeverityIcon = severityConfig.icon;

  // 获取影响描述（从 metadata 或 description 中提取）
  const getImpactText = () => {
    if (suggestion.metadata) {
      // Dr.Dre 的影响
      if (suggestion.metadata.metricType && suggestion.metadata.currentValue !== undefined) {
        return `当前值: ${suggestion.metadata.currentValue}，阈值: ${suggestion.metadata.threshold}`;
      }
      // Neptune 的影响
      if (suggestion.metadata.alternatives && suggestion.metadata.alternatives.length > 0) {
        const alt = suggestion.metadata.alternatives[0];
        const impacts: string[] = [];
        if (alt.impact.timeChange) impacts.push(`时间: ${alt.impact.timeChange > 0 ? '+' : ''}${alt.impact.timeChange}分钟`);
        if (alt.impact.distanceChange) impacts.push(`距离: ${alt.impact.distanceChange > 0 ? '+' : ''}${alt.impact.distanceChange}km`);
        if (alt.impact.costChange) impacts.push(`成本: ${alt.impact.costChange > 0 ? '+' : ''}${alt.impact.costChange}元`);
        return impacts.join('，') || '影响较小';
      }
    }
    return suggestion.description || '请查看详情';
  };

  // 获取主要操作（primary action）
  const primaryAction = suggestion.actions.find(a => a.primary) || suggestion.actions[0];
  const otherActions = suggestion.actions.filter(a => a.id !== primaryAction?.id);

  return (
    <Card className={cn('border-2 transition-colors', className)}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* 三人格图标 */}
            <div className={cn('p-2 rounded-md border', personaColors)}>
              <PersonaIcon className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className={cn('text-base', compact && 'text-sm')}>
                  {suggestion.title}
                </CardTitle>
                <Badge variant="outline" className={cn('text-xs', severityConfig.badge)}>
                  <SeverityIcon className="w-3 h-3 mr-1" />
                  {severityConfig.label}
                </Badge>
              </div>
              <CardDescription className={cn('text-sm mt-1', compact && 'text-xs')}>
                {suggestion.summary}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-4', compact && 'space-y-3')}>
        {/* 影响描述 */}
        {getImpactText() && (
          <div className="bg-muted/30 rounded-md p-3 border border-border/50">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">影响</p>
                <p className="text-sm text-foreground">{getImpactText()}</p>
              </div>
            </div>
          </div>
        )}

        {/* 证据（如果有） */}
        {showEvidence && suggestion.evidence && suggestion.evidence.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">证据 ({suggestion.evidence.length})</p>
              {onViewEvidence && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={() => onViewEvidence(suggestion.evidence!)}
                >
                  查看全部
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {suggestion.evidence.slice(0, compact ? 1 : 2).map((evidence) => (
                <div
                  key={evidence.id}
                  className="flex items-start gap-2 p-2 bg-muted/20 rounded border border-border/30"
                >
                  <ExternalLink className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{evidence.title}</p>
                    {evidence.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{evidence.description}</p>
                    )}
                    {evidence.source && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">来源: {evidence.source}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center gap-2">
          {primaryAction && (
            <Button
              size={compact ? 'sm' : 'default'}
              variant={primaryAction.primary ? 'default' : 'outline'}
              onClick={() => onAction?.(primaryAction)}
              className="flex-1 min-w-[120px]"
            >
              {primaryAction.label}
            </Button>
          )}
          {otherActions.map((action) => (
            <Button
              key={action.id}
              size={compact ? 'sm' : 'default'}
              variant="outline"
              onClick={() => onAction?.(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
