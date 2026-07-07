/**
 * 助手中心组件 - 优化建议
 * 统一的建议列表容器，插画风格卡片设计
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Shield, Activity, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { Suggestion } from '@/types/suggestion';
import type { TripDetail } from '@/types/trip';
import { cn } from '@/lib/utils';
import { OptimizationSuggestionCard } from './OptimizationSuggestionCard';
import type { SuggestionMetrics } from './OptimizationSuggestionCard';

interface AssistantCenterProps {
  suggestions: Suggestion[];
  loading?: boolean;
  trip?: TripDetail | null;
  onSuggestionClick?: (suggestion: Suggestion) => void;
  onActionClick?: (suggestion: Suggestion, actionId: string) => void;
  onDismissSuggestion?: (suggestion: Suggestion) => void;
  getMetrics?: (suggestion: Suggestion) => SuggestionMetrics[] | undefined;
  className?: string;
}

type FilterTab = 'all' | 'abu' | 'drdre' | 'neptune';
// type ScopeFilter = 'all' | 'trip' | 'day' | 'item'; // 暂时未使用

const ____personaConfig = {
  abu: {
    icon: Shield,
    label: '风险',
    color: 'text-gate-reject-foreground',
  },
  drdre: {
    icon: Activity,
    label: '节奏',
    color: 'text-orange-600',
  },
  neptune: {
    icon: RefreshCw,
    label: '修复',
    color: 'text-yellow-600',
  },
};

export function AssistantCenter({
  suggestions,
  loading = false,
  trip: _trip,
  onSuggestionClick,
  onActionClick,
  onDismissSuggestion,
  getMetrics,
  className,
}: AssistantCenterProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  // const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all'); // 暂时未使用

  // 过滤建议
  const filteredSuggestions = suggestions.filter((suggestion) => {
    if (activeTab !== 'all' && suggestion.persona !== activeTab) return false;
    // if (scopeFilter !== 'all' && suggestion.scope !== scopeFilter) return false; // 暂时未使用
    return true;
  });

  // 统计
  const stats = {
    all: suggestions.length,
    abu: suggestions.filter((s) => s.persona === 'abu').length,
    drdre: suggestions.filter((s) => s.persona === 'drdre').length,
    neptune: suggestions.filter((s) => s.persona === 'neptune').length,
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Spinner className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-sm border-gray-200", className)}>
      <CardHeader className="p-3 sm:p-4 pb-1">
        <CardTitle className="text-sm sm:text-base font-semibold text-gray-900">优化建议</CardTitle>
        <CardDescription className="text-xs text-gray-500 mt-0.5">安全、节奏、修复三维度的改进建议</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-1">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-9">
            <TabsTrigger value="all" className="relative text-xs">
              全部
              {stats.all > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {stats.all}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="abu" className="relative text-xs">
              <Shield className="w-3 h-3 mr-1" />
              风险
              {stats.abu > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                  {stats.abu}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="drdre" className="relative text-xs">
              <Activity className="w-3 h-3 mr-1" />
              节奏
              {stats.drdre > 0 && (
                <Badge variant="default" className="ml-1 h-4 px-1 text-xs bg-orange-500">
                  {stats.drdre}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="neptune" className="relative text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              修复
              {stats.neptune > 0 && (
                <Badge variant="default" className="ml-1 h-4 px-1 text-xs bg-yellow-500">
                  {stats.neptune}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            {filteredSuggestions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium mb-0.5">当前行程很健康 ✅</p>
                <p>暂无需要处理的建议</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSuggestions.map((suggestion, index) => (
                  <OptimizationSuggestionCard
                    key={suggestion.id || `suggestion-${index}-${suggestion.createdAt}`}
                    suggestion={suggestion}
                    metrics={getMetrics?.(suggestion)}
                    highPriority={suggestion.severity === 'blocker'}
                    onApply={(s) => {
                      const applyAction = s.actions.find(
                        (a) => a.type === 'apply' || a.label.includes('应用') || a.label.includes('采纳') || a.label.includes('调整') || a.label.includes('修复')
                      );
                      if (applyAction) onActionClick?.(s, applyAction.id);
                    }}
                    onDismiss={onDismissSuggestion}
                    onClick={() => onSuggestionClick?.(suggestion)}
                    onActionClick={(s, actionId) => onActionClick?.(s, actionId)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


