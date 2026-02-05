/**
 * 规划Tab - 建议列表面板组件
 * 显示改进建议列表，支持筛选和应用
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Filter, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Suggestion } from '@/types/suggestion';

interface PlanSuggestionsPanelProps {
  suggestions: Suggestion[];
  loading?: boolean;
  onSuggestionClick?: (suggestion: Suggestion) => void;
  onApplySuggestion?: (suggestion: Suggestion) => void;
  onViewAll?: () => void;
}

export default function PlanSuggestionsPanel({
  suggestions,
  loading = false,
  onSuggestionClick,
  onApplySuggestion,
  onViewAll,
}: PlanSuggestionsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'blocker' | 'warn' | 'info'>('all');

  const filteredSuggestions = useMemo(() => {
    if (filter === 'all') return suggestions;
    return suggestions.filter(s => s.severity === filter);
  }, [suggestions, filter]);

  const suggestionStats = useMemo(() => {
    return {
      blocker: suggestions.filter(s => s.severity === 'blocker').length,
      warn: suggestions.filter(s => s.severity === 'warn').length,
      info: suggestions.filter(s => s.severity === 'info').length,
    };
  }, [suggestions]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warn':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return AlertTriangle;
      case 'warn':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return '红线';
      case 'warn':
        return '警告';
      case 'info':
        return '提示';
      default:
        return severity;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">改进建议</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            改进建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>暂无建议，行程状态良好！</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-suggestions-panel>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            改进建议
            <Badge variant="secondary" className="ml-2">
              {suggestions.length}
            </Badge>
          </CardTitle>
          {onViewAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="text-xs"
            >
              查看全部
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 筛选器 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs h-7"
          >
            全部 ({suggestions.length})
          </Button>
          {suggestionStats.blocker > 0 && (
            <Button
              variant={filter === 'blocker' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('blocker')}
              className="text-xs h-7"
            >
              红线 ({suggestionStats.blocker})
            </Button>
          )}
          {suggestionStats.warn > 0 && (
            <Button
              variant={filter === 'warn' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('warn')}
              className="text-xs h-7"
            >
              警告 ({suggestionStats.warn})
            </Button>
          )}
          {suggestionStats.info > 0 && (
            <Button
              variant={filter === 'info' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('info')}
              className="text-xs h-7"
            >
              提示 ({suggestionStats.info})
            </Button>
          )}
        </div>

        {/* 建议列表 */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredSuggestions.slice(0, 5).map((suggestion) => {
            const Icon = getSeverityIcon(suggestion.severity);
            
            return (
              <div
                key={suggestion.id}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-colors',
                  getSeverityColor(suggestion.severity),
                  onSuggestionClick && 'hover:opacity-80'
                )}
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getSeverityColor(suggestion.severity))}
                        >
                          {getSeverityLabel(suggestion.severity)}
                        </Badge>
                        {suggestion.persona && (
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.persona === 'abu' ? 'Abu' : suggestion.persona === 'drdre' ? 'Dr.Dre' : 'Neptune'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-2">
                        {suggestion.title || suggestion.summary || suggestion.description || '无描述'}
                      </p>
                    </div>
                  </div>
                </div>
                {onApplySuggestion && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplySuggestion(suggestion);
                    }}
                    className="w-full mt-2 text-xs h-7"
                  >
                    应用建议
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {filteredSuggestions.length > 5 && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewAll?.()}
              className="text-xs"
            >
              查看更多 ({filteredSuggestions.length - 5})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
