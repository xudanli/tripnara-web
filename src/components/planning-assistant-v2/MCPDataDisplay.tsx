/**
 * Planning Assistant V2 - MCP 服务数据统一显示组件
 * 
 * 根据路由目标显示相应的数据
 */

import { RecommendationCarousel } from './RecommendationCarousel';
import { HotelList } from './HotelList';
import { AccommodationList } from './AccommodationList';
import { RestaurantList } from './RestaurantList';
import { WeatherDisplay } from './WeatherDisplay';
import { SearchResults } from './SearchResults';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Train, Languages, DollarSign, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/hooks/useChatV2';

interface MCPDataDisplayProps {
  message: ChatMessage;
  className?: string;
}

export function MCPDataDisplay({ message, className }: MCPDataDisplayProps) {
  const { routing } = message;

  // 住宿混合列表：routing.target === 'accommodation' 或 accommodations 存在时展示
  if (message.accommodations && message.accommodations.length > 0) {
    return (
      <AccommodationList
        accommodations={message.accommodations}
        className={cn('mt-3', className)}
      />
    );
  }

  if (!routing) {
    return null;
  }

  // 根据路由目标显示相应的数据
  switch (routing.target) {
    case 'recommendations':
      if (message.recommendations && message.recommendations.length > 0) {
        return (
          <RecommendationCarousel
            recommendations={message.recommendations}
            className={cn('mt-3', className)}
          />
        );
      }
      break;

    case 'hotel':
      if (message.hotels && message.hotels.length > 0) {
        return <HotelList hotels={message.hotels} className={cn('mt-3', className)} />;
      }
      break;

    case 'accommodation':
      // 已在顶部统一处理 accommodations
      break;

    case 'restaurant':
      if (message.restaurants && message.restaurants.length > 0) {
        return (
          <RestaurantList
            restaurants={message.restaurants}
            className={cn('mt-3', className)}
          />
        );
      }
      break;

    case 'weather':
      if (message.weather) {
        return <WeatherDisplay weather={message.weather} className={cn('mt-3', className)} />;
      }
      break;

    case 'search':
      if (message.searchResults && message.searchResults.length > 0) {
        return (
          <SearchResults
            results={message.searchResults}
            className={cn('mt-3', className)}
          />
        );
      }
      break;

    case 'flight':
      if (message.flights && message.flights.length > 0) {
        return (
          <div className={cn('mt-3 space-y-3', className)}>
            {message.flights.map((flight: any, index: number) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
                      <Plane className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{flight.origin}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{flight.destination}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">{flight.duration}</span>
                        {flight.price && (
                          <span className="text-base font-semibold text-primary">
                            {flight.price.amount} {flight.price.currency}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }
      break;

    case 'rail':
      if (message.railRoutes && message.railRoutes.length > 0) {
        return (
          <div className={cn('mt-3 space-y-3', className)}>
            {message.railRoutes.map((route: any, index: number) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
                      <Train className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{route.origin}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{route.destination}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">{route.duration}</span>
                        {route.price && (
                          <span className="text-base font-semibold text-primary">
                            {route.price.amount} {route.price.currency}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }
      break;

    case 'translate':
      if (message.translation) {
        const trans = message.translation;
        return (
          <Card className={cn('mt-3', className)}>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Languages className="w-5 h-5 text-primary" />
                <Badge variant="outline" className="text-xs">
                  {trans.source} → {trans.target}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed">{trans.text}</p>
            </CardContent>
          </Card>
        );
      }
      break;

    case 'currency':
      if (message.currencyConversion) {
        const conv = message.currencyConversion;
        return (
          <Card className={cn('mt-3', className)}>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold">
                    1 {conv.from} = {conv.rate} {conv.to}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    转换结果: <span className="text-base font-medium text-primary">{conv.result} {conv.to}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }
      break;

    case 'image':
      if (message.images && message.images.length > 0) {
        return (
          <div className={cn('mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3', className)}>
            {message.images.map((img: any, index: number) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                <img
                  src={img.url}
                  alt={img.title || `图片 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        );
      }
      break;

    default:
      return null;
  }

  return null;
}
