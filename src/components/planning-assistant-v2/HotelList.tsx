/**
 * Planning Assistant V2 - 酒店列表组件
 * 渐进式披露：默认展示前 4 条，可展开全部；列表区域固定高度 + 内部滚动
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Phone, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Hotel } from '@/api/planning-assistant-v2';

const INITIAL_VISIBLE = 4;
const LIST_MAX_HEIGHT = 320;

interface HotelListProps {
  hotels: Hotel[];
  className?: string;
}

export function HotelList({ hotels, className }: HotelListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hotels || hotels.length === 0) {
    return null;
  }

  const total = hotels.length;
  const visibleCount = expanded ? total : Math.min(INITIAL_VISIBLE, total);
  const hasMore = total > INITIAL_VISIBLE && !expanded;
  const visibleHotels = hotels.slice(0, visibleCount);

  return (
    <div className={cn('mt-4', className)}>
      <div
        className="space-y-3 overflow-y-auto pr-1"
        style={{ maxHeight: LIST_MAX_HEIGHT }}
      >
        {visibleHotels.map((hotel) => (
        <Card key={hotel.placeId} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {hotel.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{hotel.address}</p>
              </div>
              <div className="flex items-center gap-2">
                {hotel.rating && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {hotel.rating.toFixed(1)}
                    {hotel.userRatingsTotal && (
                      <span className="text-xs">({hotel.userRatingsTotal})</span>
                    )}
                  </Badge>
                )}
                {hotel.priceLevel && (
                  <Badge variant="outline" className="text-xs">
                    {'$'.repeat(hotel.priceLevel)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotel.phoneNumber && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                {hotel.phoneNumber}
              </div>
            )}
            {hotel.website && (
              <div className="flex items-center gap-2 text-xs">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <a
                  href={hotel.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  查看网站
                </a>
              </div>
            )}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {hotel.amenities.slice(0, 5).map((amenity, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
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
