/**
 * Planning Assistant V2 - 住宿混合列表（酒店 + Airbnb）
 * 渐进式披露：默认展示前 4 条，可展开全部；列表区域固定高度 + 内部滚动
 * 支持「加入行程」：需传入 tripId、tripInfo
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Building2, Home, ExternalLink, ChevronDown, Navigation, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Accommodation } from '@/api/planning-assistant-v2';
import type { TripDetail } from '@/types/trip';
import { AddAccommodationToTripDialog } from './AddAccommodationToTripDialog';

const INITIAL_VISIBLE = 4;
const LIST_MAX_HEIGHT = 320;

interface AccommodationListProps {
  accommodations: Accommodation[];
  /** 行程 ID，有则显示「加入行程」按钮 */
  tripId?: string;
  /** 行程详情（含 TripDay），有则支持加入行程 */
  tripInfo?: TripDetail;
  /** 加入行程成功后的回调（如刷新日程） */
  onAddToTripSuccess?: () => void;
  className?: string;
}

export function AccommodationList({
  accommodations,
  tripId,
  tripInfo,
  onAddToTripSuccess,
  className,
}: AccommodationListProps) {
  const [expanded, setExpanded] = useState(false);
  const [addDialogItem, setAddDialogItem] = useState<Accommodation | null>(null);

  const canAddToTrip = Boolean(tripId && tripInfo?.TripDay?.length);

  if (!accommodations || accommodations.length === 0) {
    return null;
  }

  const total = accommodations.length;
  const visibleCount = expanded ? total : Math.min(INITIAL_VISIBLE, total);
  const hasMore = total > INITIAL_VISIBLE && !expanded;
  const visibleItems = accommodations.slice(0, visibleCount);

  return (
    <div className={cn('mt-4', className)}>
      <div
        className="space-y-3 overflow-y-auto pr-1"
        style={{ maxHeight: LIST_MAX_HEIGHT }}
      >
        {visibleItems.map((item) => {
          const displayName = item.nameCN || item.nameEN || item.name;
          return (
        <Card key={item.id} className="hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-0">
            <div className="flex gap-3 p-4">
              {item.photoUrl && (
                <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={item.photoUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{displayName}</span>
                    <Badge
                      variant={item.source === 'hotel' ? 'secondary' : 'outline'}
                      className="text-xs shrink-0"
                    >
                      {item.source === 'hotel' ? (
                        <Building2 className="w-3 h-3 mr-1" />
                      ) : (
                        <Home className="w-3 h-3 mr-1" />
                      )}
                      {item.source === 'hotel' ? '酒店' : 'Airbnb'}
                    </Badge>
                  </div>
                  {item.roomSpecs && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.roomSpecs}</p>
                  )}
                  {item.address && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {item.address}
                    </p>
                  )}
                  {(item.distanceKm != null || item.nearestPlaceName) && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Navigation className="w-3 h-3 flex-shrink-0" />
                      {item.distanceKm != null && item.nearestPlaceName
                        ? `距${item.nearestPlaceName} ${item.distanceKm.toFixed(1)}km`
                        : item.distanceKm != null
                        ? `距当日行程点 ${item.distanceKm.toFixed(1)}km`
                        : item.nearestPlaceName
                        ? `近${item.nearestPlaceName}`
                        : null}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {item.rating != null && (
                      <span className="text-xs flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        {item.rating.toFixed(1)}
                        {item.ratingCount != null && (
                          <span className="text-muted-foreground">({item.ratingCount})</span>
                        )}
                      </span>
                    )}
                    {item.price && (
                      <span className="text-sm font-medium text-primary">{item.price}</span>
                    )}
                    {!item.price && item.priceLevel != null && (
                      <span className="text-xs text-muted-foreground">
                        {'$'.repeat(item.priceLevel)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      查看
                    </a>
                  )}
                  {canAddToTrip && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAddDialogItem(item)}
                    >
                      <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                      加入行程
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          );
        })}
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

      {addDialogItem && tripId && tripInfo && (
        <AddAccommodationToTripDialog
          open={!!addDialogItem}
          onOpenChange={(open) => !open && setAddDialogItem(null)}
          accommodation={addDialogItem}
          tripId={tripId}
          tripInfo={tripInfo}
          onSuccess={onAddToTripSuccess}
        />
      )}
    </div>
  );
}
