/**
 * Airbnb 房源卡片组件
 * 
 * 展示单个 Airbnb 房源信息，符合 TripNARA 设计系统
 */

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Star, 
  ExternalLink, 
  Home,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AirbnbListing } from '@/api/airbnb';

interface AirbnbSearchCardProps {
  listing: AirbnbListing;
  onViewDetails?: (listingId: string) => void;
  onAddToTrip?: (listing: AirbnbListing) => void;
  className?: string;
  compact?: boolean;
  searchParams?: {
    checkin?: string;
    checkout?: string;
    adults?: number;
  };
}

export function AirbnbSearchCard({
  listing,
  onViewDetails,
  onAddToTrip,
  className,
  compact = false,
  searchParams,
}: AirbnbSearchCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // 提取评分信息
  const ratingMatch = listing.avgRatingA11yLabel?.match(/(\d+\.?\d*)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
  const reviewsMatch = listing.avgRatingA11yLabel?.match(/(\d+)\s*reviews?/);
  const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : null;

  // 提取价格信息
  const priceText = listing.structuredDisplayPrice?.primaryLine?.accessibilityLabel || '';
  const priceMatch = priceText.match(/\$(\d+)/);
  const price = priceMatch ? parseInt(priceMatch[1]) : null;

  const listingName = listing.demandStayListing?.description?.name?.localizedStringWithTranslationPreference || '未知房源';
  const location = listing.demandStayListing?.location?.coordinate;
  const primaryLine = listing.structuredContent?.primaryLine || '';
  const secondaryLine = listing.structuredContent?.secondaryLine || '';

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-md cursor-pointer",
        compact && "border-l-4 border-l-primary",
        className
      )}
      onClick={() => onViewDetails?.(listing.id)}
    >
      <div className="flex flex-col sm:flex-row">
        {/* 房源图片区域 */}
        <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-muted flex-shrink-0">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Home className="w-12 h-12 text-muted-foreground/50" />
            </div>
          ) : (
            <img
              src={listing.url}
              alt={listingName}
              className={cn(
                "w-full h-full object-cover",
                imageLoading && "opacity-0"
              )}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}
        </div>

        {/* 房源信息区域 */}
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1">
            {/* 房源名称 */}
            <h3 className="font-semibold text-base mb-2 line-clamp-2">
              {listingName}
            </h3>

            {/* 位置信息 */}
            {location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </span>
              </div>
            )}

            {/* 房源类型和日期 */}
            <div className="space-y-1 mb-3">
              {primaryLine && (
                <p className="text-sm text-foreground">{primaryLine}</p>
              )}
              {secondaryLine && (
                <p className="text-xs text-muted-foreground">{secondaryLine}</p>
              )}
            </div>

            {/* 评分和评价 */}
            {rating && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{rating}</span>
                </div>
                {reviewsCount && (
                  <span className="text-xs text-muted-foreground">
                    ({reviewsCount} 评价)
                  </span>
                )}
              </div>
            )}

            {/* 价格信息 */}
            {price && (
              <div className="mb-3">
                <Badge variant="secondary" className="text-sm font-medium">
                  ${price}/晚
                </Badge>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <CardFooter className="p-0 pt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                if (onViewDetails) {
                  onViewDetails(listing.id);
                } else {
                  // 默认行为：打开 Airbnb 页面
                  window.open(listing.url, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              查看详情
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            {onAddToTrip && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToTrip?.(listing);
                }}
              >
                添加到行程
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                window.open(listing.url, '_blank', 'noopener,noreferrer');
              }}
              title="在 Airbnb 打开"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}
