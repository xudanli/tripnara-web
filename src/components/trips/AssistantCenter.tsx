/**
 * 助手中心组件
 * 统一的建议列表容器，替代原有的Top Risks等分散展示
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Shield, Activity, RefreshCw, AlertTriangle, Info, CheckCircle2, Calendar } from 'lucide-react';
import type { Suggestion } from '@/types/suggestion';
import type { TripDetail } from '@/types/trip';
import { cn } from '@/lib/utils';

interface AssistantCenterProps {
  suggestions: Suggestion[];
  loading?: boolean;
  trip?: TripDetail | null; // 用于解析 dayId 到 day 索引
  onSuggestionClick?: (suggestion: Suggestion) => void;
  onActionClick?: (suggestion: Suggestion, actionId: string) => void;
  className?: string;
}

type FilterTab = 'all' | 'abu' | 'drdre' | 'neptune';
// type ScopeFilter = 'all' | 'trip' | 'day' | 'item'; // 暂时未使用

const personaConfig = {
  abu: {
    icon: Shield,
    label: '风险',
    color: 'text-red-600',
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

const severityConfig = {
  blocker: {
    icon: AlertTriangle,
    label: '红线',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  warn: {
    icon: Info,
    label: '警告',
    className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  info: {
    icon: Info,
    label: '提示',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
};

export function AssistantCenter({
  suggestions,
  loading = false,
  trip,
  onSuggestionClick,
  onActionClick,
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
    <Card className={className}>
      <CardHeader>
        <CardTitle>助手中心</CardTitle>
        <CardDescription>三人格的建议与提醒</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="relative">
              全部
              {stats.all > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {stats.all}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="abu" className="relative">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              风险
              {stats.abu > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
                  {stats.abu}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="drdre" className="relative">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              节奏
              {stats.drdre > 0 && (
                <Badge variant="default" className="ml-1.5 h-5 px-1.5 text-xs bg-orange-500">
                  {stats.drdre}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="neptune" className="relative">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              修复
              {stats.neptune > 0 && (
                <Badge variant="default" className="ml-1.5 h-5 px-1.5 text-xs bg-yellow-500">
                  {stats.neptune}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredSuggestions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-1">当前行程很健康 ✅</p>
                <p>暂无需要处理的建议</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSuggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id || `suggestion-${index}-${suggestion.createdAt}`}
                    suggestion={suggestion}
                    trip={trip}
                    onClick={() => onSuggestionClick?.(suggestion)}
                    onActionClick={(actionId) => onActionClick?.(suggestion, actionId)}
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

interface SuggestionCardProps {
  suggestion: Suggestion;
  trip?: TripDetail | null;
  onClick?: () => void;
  onActionClick?: (actionId: string) => void;
}

function SuggestionCard({ suggestion, trip, onClick, onActionClick }: SuggestionCardProps) {
  const persona = personaConfig[suggestion.persona];
  const PersonaIcon = persona.icon;
  const severity = severityConfig[suggestion.severity];
  const SeverityIcon = severity.icon;

  // 优化标题显示：提炼核心冲突点，使用更自然的语言
  const getOptimizedTitle = () => {
    const title = suggestion.title || '';
    // 如果是时间冲突，优化显示
    if (title.includes('时间重叠') || title.includes('时间冲突')) {
      return '🚨 时间冲突';
    }
    // 如果是节奏问题
    if (title.includes('节奏') || title.includes('过快') || title.includes('过慢')) {
      return '🧠 节奏问题';
    }
    // 如果是安全风险
    if (title.includes('风险') || title.includes('安全')) {
      return '⚠️ 安全风险';
    }
    return title;
  };

  // 提取 Day 信息：从 dayId 解析为 Day 1, Day 2 等
  const getDayInfo = (): string | null => {
    // 如果 metadata 中有 day 索引，直接使用
    if (suggestion.scope === 'day' && suggestion.metadata?.day) {
      return `Day ${suggestion.metadata.day}`;
    }
    
    // 如果有 scopeId（可能是 dayId），尝试从 trip 数据中解析
    if (suggestion.scopeId && trip?.TripDay) {
      const dayIndex = trip.TripDay.findIndex(day => day.id === suggestion.scopeId);
      if (dayIndex >= 0) {
        return `Day ${dayIndex + 1}`;
      }
      // 如果找不到，可能是其他类型的 ID，尝试直接显示（但格式化为更友好的形式）
      // 检查是否是 UUID 格式
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(suggestion.scopeId)) {
        // 是 UUID，但不匹配任何 day，返回 null（不显示）
        return null;
      }
      // 不是 UUID，可能是其他格式的 ID，直接显示
      return `Day ${suggestion.scopeId}`;
    }
    
    return null;
  };
  
  const dayInfo = getDayInfo();

  return (
    <div
      className={cn(
        'p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all space-y-3',
        severity.className,
        'bg-white' // 降低红色卡片饱和度，使用白色背景
      )}
      onClick={onClick}
    >
      {/* 标题行 */}
      <div className="flex items-start gap-2">
        <PersonaIcon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', persona.color)} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm">{getOptimizedTitle()}</span>
            <Badge variant="outline" className={cn('text-xs', severity.className)}>
              <SeverityIcon className="w-3 h-3 mr-1" />
              {severity.label}
            </Badge>
            {dayInfo && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {dayInfo}
              </Badge>
            )}
          </div>
          {/* 优化描述：使用更自然的语言 */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {suggestion.description || suggestion.summary}
          </p>
          {/* 如果有建议文本 */}
          {suggestion.metadata?.suggestion && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              建议：{suggestion.metadata.suggestion}
            </p>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      {suggestion.actions.length > 0 && (
        <div className="flex gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          {suggestion.actions.slice(0, 2).map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant={action.primary || action.label.includes('调整') || action.label.includes('修复') ? 'default' : 'outline'}
              className={cn(
                'text-xs h-8',
                (action.primary || action.label.includes('调整') || action.label.includes('修复')) && 'bg-gray-900 hover:bg-gray-800 text-white'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onActionClick?.(action.id);
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

