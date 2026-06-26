/**
 * Planning Assistant V2 - 餐厅列表组件
 * 渐进式披露：默认展示前 4 条，可展开全部；列表区域固定高度 + 内部滚动
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Utensils, Star, Phone, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/api/planning-assistant-v2';

const INITIAL_VISIBLE = 4;
const LIST_MAX_HEIGHT = 320;

interface RestaurantListProps {
  restaurants: Restaurant[];
  className?: string;
}

export function RestaurantList({ restaurants, className }: RestaurantListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!restaurants || restaurants.length === 0) {
    return null;
  }

  const total = restaurants.length;
  const visibleCount = expanded ? total : Math.min(INITIAL_VISIBLE, total);
  const hasMore = total > INITIAL_VISIBLE && !expanded;
  const visibleRestaurants = restaurants.slice(0, visibleCount);

  return (
    <div className={cn('mt-4', className)}>
      <div
        className="space-y-3 overflow-y-auto pr-1"
        style={{ maxHeight: LIST_MAX_HEIGHT }}
      >
        {visibleRestaurants.map((restaurant) => (
        <Card key={restaurant.placeId} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-primary" />
                  {restaurant.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{restaurant.address}</p>
              </div>
              <div className="flex items-center gap-2">
                {restaurant.rating && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {restaurant.rating.toFixed(1)}
                    {restaurant.userRatingsTotal && (
                      <span className="text-xs">({restaurant.userRatingsTotal})</span>
                    )}
                  </Badge>
                )}
                {restaurant.priceLevel && (
                  <Badge variant="outline" className="text-xs">
                    {'$'.repeat(restaurant.priceLevel)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {restaurant.openingHours && (
              <div className="text-xs text-muted-foreground">
                {restaurant.openingHours.openNow ? (
                  <span className="text-green-600">🟢 正在营业</span>
                ) : (
                  <span className="text-red-600">🔴 已关闭</span>
                )}
              </div>
            )}
            {restaurant.phoneNumber && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                {restaurant.phoneNumber}
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center gap-2 text-xs">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  查看网站
                </a>
              </div>
            )}
          </CardContent>
        </Card>
        ))}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(true)}
        >
          <ChevronDown className="w-4 h-4 mr-1" />
          展开全部 {total} 个
        </Button>
      )}
    </div>
  );
}
