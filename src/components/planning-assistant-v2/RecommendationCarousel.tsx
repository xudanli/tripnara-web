/**
 * Planning Assistant V2 - 推荐卡片轮播组件
 * 在对话界面中显示推荐卡片，支持左右切换
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recommendation } from '@/api/planning-assistant-v2';

interface RecommendationCarouselProps {
  recommendations: Recommendation[];
  onSelect?: (recommendationId: string) => void;
  className?: string;
}

export function RecommendationCarousel({
  recommendations,
  onSelect,
  className,
}: RecommendationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const currentRec = recommendations[currentIndex];
  const hasMultiple = recommendations.length > 1;

  // 兼容不同的字段名：reasons 或 matchReasons
  const reasons = currentRec.reasons || currentRec.matchReasons || currentRec.matchReasonsCN || [];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? recommendations.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === recommendations.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={cn('mt-4 relative', className)}>
      {/* 推荐卡片 */}
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-lg',
          onSelect && 'hover:border-primary'
        )}
        onClick={() => onSelect?.(currentRec.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {currentRec.nameCN || currentRec.name || '未知目的地'}
              </CardTitle>
              {currentRec.countryCode && (
                <p className="text-xs text-muted-foreground mt-1">
                  {currentRec.countryCode}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="ml-2">
                <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                {currentRec.matchScore || 0}%
              </Badge>
              {hasMultiple && (
                <Badge variant="outline" className="text-xs">
                  {currentIndex + 1} / {recommendations.length}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {currentRec.descriptionCN || currentRec.description || '暂无描述'}
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
          {currentRec.highlightsCN && currentRec.highlightsCN.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentRec.highlightsCN.slice(0, 3).map((highlight: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {highlight}
                </Badge>
              ))}
            </div>
          )}
          {currentRec.estimatedBudget && (
            <div className="text-xs text-muted-foreground">
              预算: {currentRec.estimatedBudget.min}-{currentRec.estimatedBudget.max}{' '}
              {currentRec.estimatedBudget.currency || 'CNY'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 左右切换按钮 */}
      {hasMultiple && (
        <div className="flex items-center justify-between mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            上一个
          </Button>
          <div className="flex gap-1">
            {recommendations.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentIndex
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
                aria-label={`切换到第 ${index + 1} 个推荐`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="flex items-center gap-1"
          >
            下一个
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
