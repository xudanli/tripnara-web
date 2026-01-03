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
import { Shield, TrendingUp, Wrench, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import type { Suggestion, PersonaType, SuggestionScope } from '@/types/suggestion';
import { cn } from '@/lib/utils';

interface AssistantCenterProps {
  suggestions: Suggestion[];
  loading?: boolean;
  onSuggestionClick?: (suggestion: Suggestion) => void;
  onActionClick?: (suggestion: Suggestion, actionId: string) => void;
  className?: string;
}

type FilterTab = 'all' | 'abu' | 'drdre' | 'neptune';
type ScopeFilter = 'all' | 'trip' | 'day' | 'item';

const personaConfig = {
  abu: {
    icon: Shield,
    label: '风险',
    color: 'text-red-600',
  },
  drdre: {
    icon: TrendingUp,
    label: '节奏',
    color: 'text-orange-600',
  },
  neptune: {
    icon: Wrench,
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
  onSuggestionClick,
  onActionClick,
  className,
}: AssistantCenterProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');

  // 过滤建议
  const filteredSuggestions = suggestions.filter((suggestion) => {
    if (activeTab !== 'all' && suggestion.persona !== activeTab) return false;
    if (scopeFilter !== 'all' && suggestion.scope !== scopeFilter) return false;
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
            <TabsTrigger value="all">
              全部 {stats.all > 0 && <span className="ml-1">({stats.all})</span>}
            </TabsTrigger>
            <TabsTrigger value="abu">
              <Shield className="w-3 h-3 mr-1" />
              风险 {stats.abu > 0 && <span className="ml-1">({stats.abu})</span>}
            </TabsTrigger>
            <TabsTrigger value="drdre">
              <TrendingUp className="w-3 h-3 mr-1" />
              节奏 {stats.drdre > 0 && <span className="ml-1">({stats.drdre})</span>}
            </TabsTrigger>
            <TabsTrigger value="neptune">
              <Wrench className="w-3 h-3 mr-1" />
              修复 {stats.neptune > 0 && <span className="ml-1">({stats.neptune})</span>}
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
  onClick?: () => void;
  onActionClick?: (actionId: string) => void;
}

function SuggestionCard({ suggestion, onClick, onActionClick }: SuggestionCardProps) {
  const persona = personaConfig[suggestion.persona];
  const PersonaIcon = persona.icon;
  const severity = severityConfig[suggestion.severity];
  const SeverityIcon = severity.icon;

  return (
    <div
      className={cn(
        'p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
        severity.className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2 mb-2">
        <PersonaIcon className={cn('w-4 h-4 mt-0.5', persona.color)} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{suggestion.title}</span>
            <Badge variant="outline" className={cn('text-xs', severity.className)}>
              <SeverityIcon className="w-3 h-3 mr-1" />
              {severity.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{suggestion.summary}</p>
        </div>
      </div>

      {suggestion.actions.length > 0 && (
        <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
          {suggestion.actions.slice(0, 2).map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant={action.primary ? 'default' : 'outline'}
              className="text-xs h-7"
              onClick={() => onActionClick?.(action.id)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

