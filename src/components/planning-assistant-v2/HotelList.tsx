/**
 * Planning Assistant V2 - 酒店列表组件
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Phone, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Hotel } from '@/api/planning-assistant-v2';

interface HotelListProps {
  hotels: Hotel[];
  className?: string;
}

export function HotelList({ hotels, className }: HotelListProps) {
  if (!hotels || hotels.length === 0) {
    return null;
  }

  return (
    <div className={cn('mt-4 space-y-3', className)}>
      {hotels.map((hotel) => (
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
  );
}
