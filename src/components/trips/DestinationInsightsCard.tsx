/**
 * 目的地深度信息卡片组件
 * 
 * 显示目的地的特色贴士、隐藏攻略和路线洞察
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useRag } from '@/hooks';
import type { DestinationInsights } from '@/api/rag';
import { Lightbulb, MapPin, Route, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DestinationInsightsCardProps {
  placeId: string;
  tripId?: string;
  countryCode?: string;
  className?: string;
}

export default function DestinationInsightsCard({
  placeId,
  tripId,
  countryCode,
  className,
}: DestinationInsightsCardProps) {
  const { getDestinationInsights, loading, error } = useRag();
  const [insights, setInsights] = useState<DestinationInsights | null>(null);

  useEffect(() => {
    loadInsights();
  }, [placeId, tripId, countryCode]);

  const loadInsights = async () => {
    const result = await getDestinationInsights({
      placeId,
      tripId,
      countryCode,
    });
    if (result) {
      setInsights(result);
    }
  };

  if (loading && !insights) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Spinner className="w-6 h-6" />
            <span className="ml-2 text-sm text-muted-foreground">加载目的地信息...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !insights) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-destructive">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm">加载失败: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <CardTitle>目的地深度信息</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadInsights}
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
        <CardDescription>
          特色贴士和隐藏攻略 • {insights.credibility.ragSources} 个来源
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 贴士 */}
        {insights.insights.tips && insights.insights.tips.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              旅行贴士
            </h4>
            <div className="space-y-2">
              {insights.insights.tips.map((tip, index) => (
                <div
                  key={index}
                  className="p-3 bg-muted/50 rounded-lg border border-border/50"
                >
                  <p className="text-sm">{tip.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">
                      来源: {tip.source}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      相关度: {(tip.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 当地洞察 */}
        {insights.insights.localInsights &&
          insights.insights.localInsights.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                当地洞察
              </h4>
              <div className="space-y-2">
                {insights.insights.localInsights.map((insight, index) => (
                  <div
                    key={index}
                    className="p-3 bg-primary/5 rounded-lg border border-primary/20"
                  >
                    <p className="text-sm">{insight.content}</p>
                    {insight.tags && insight.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {insight.tags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* 路线洞察 */}
        {insights.insights.routeInsights && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Route className="w-4 h-4" />
              路线信息
            </h4>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm">{insights.insights.routeInsights.answer}</p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  来源: {insights.insights.routeInsights.source}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* 可信度信息 */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              RAG 来源: {insights.credibility.ragSources} • 当地洞察:{' '}
              {insights.credibility.localInsightsCount}
            </span>
            {insights.credibility.hasRouteContext && (
              <Badge variant="outline" className="text-xs">
                包含路线上下文
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
