/**
 * Planning Assistant V2 - 推荐网格组件
 */

import { useRecommendationsV2 } from '@/hooks/useRecommendationsV2';
import { RecommendationSkeleton } from './LoadingStates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecommendationParams, Recommendation } from '@/api/planning-assistant-v2';

interface RecommendationGridProps {
  // 方式1: 直接传入推荐数据（优先使用）
  recommendations?: Recommendation[];
  // 方式2: 传入参数，通过 API 获取推荐
  params?: RecommendationParams | null;
  onSelect?: (recommendationId: string) => void;
  className?: string;
}

export function RecommendationGrid({
  recommendations: directRecommendations,
  params,
  onSelect,
  className,
}: RecommendationGridProps) {
  // 如果直接提供了推荐数据，优先使用
  console.log('[RecommendationGrid] 组件渲染检查:', {
    hasDirectRecommendations: !!directRecommendations,
    directRecommendationsLength: directRecommendations?.length || 0,
    hasParams: !!params,
    firstRecommendation: directRecommendations?.[0],
  });
  
  if (directRecommendations && directRecommendations.length > 0) {
    console.log('[RecommendationGrid] ✅ 渲染推荐数据:', {
      count: directRecommendations.length,
      firstRecommendation: directRecommendations[0],
      allRecommendations: directRecommendations,
    });
    
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full',
          className
        )}
      >
        {directRecommendations.map((rec) => {
          // 兼容不同的字段名：reasons 或 matchReasons
          const reasons = rec.reasons || rec.matchReasons || rec.matchReasonsCN || [];
          
          console.log('[RecommendationGrid] 渲染单个推荐:', {
            id: rec.id,
            name: rec.nameCN || rec.name,
            matchScore: rec.matchScore,
            reasons,
            hasDescription: !!(rec.descriptionCN || rec.description),
            countryCode: rec.countryCode,
            highlightsCN: rec.highlightsCN,
          });
          
          return (
            <Card
              key={rec.id || `rec-${Math.random()}`}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg',
                onSelect && 'hover:border-primary'
              )}
              onClick={() => onSelect?.(rec.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {rec.nameCN || rec.name || '未知目的地'}
                    </CardTitle>
                    {rec.countryCode && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {rec.countryCode}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                    {rec.matchScore || 0}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {rec.descriptionCN || rec.description || '暂无描述'}
                </p>
                {reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reasons.slice(0, 3).map((reason: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}
                {rec.highlightsCN && rec.highlightsCN.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rec.highlightsCN.slice(0, 3).map((highlight: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                )}
                {rec.estimatedBudget && (
                  <div className="text-xs text-muted-foreground">
                    预算: {rec.estimatedBudget.min}-{rec.estimatedBudget.max} {rec.estimatedBudget.currency || 'CNY'}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // 否则通过 API 获取推荐
  const { recommendations, isLoading, error } = useRecommendationsV2(params || null);

  if (isLoading) {
    return <RecommendationSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p className="text-destructive">加载推荐失败：{error.message}</p>
      </div>
    );
  }

  if (!recommendations?.recommendations.length) {
    return (
      <div className="text-center text-muted-foreground py-12">
        暂无推荐结果
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {recommendations.recommendations.map((rec) => (
        <Card
          key={rec.id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-lg',
            onSelect && 'hover:border-primary'
          )}
          onClick={() => onSelect?.(rec.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {rec.nameCN || rec.name}
                </CardTitle>
              </div>
              <Badge variant="secondary" className="ml-2">
                <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                {rec.matchScore}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {rec.descriptionCN || rec.description}
            </p>
            {rec.reasons && rec.reasons.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rec.reasons.slice(0, 3).map((reason, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
