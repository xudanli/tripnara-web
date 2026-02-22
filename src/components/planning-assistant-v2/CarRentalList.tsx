/**
 * Planning Assistant V2 - 租车列表
 *
 * 展示 Booking.com 等租车搜索结果
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CarRentalItem {
  id?: string;
  vehicleName?: string;
  vehicleType?: string;
  supplierName?: string;
  price?: { amount: number; currency: string };
  totalPrice?: number;
  currency?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDate?: string;
  dropoffDate?: string;
  bookingUrl?: string;
  [key: string]: unknown;
}

const INITIAL_VISIBLE = 4;
const LIST_MAX_HEIGHT = 480;

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function getPriceAmount(item: CarRentalItem): number | undefined {
  return item.price?.amount ?? item.totalPrice;
}

function getPriceCurrency(item: CarRentalItem): string {
  return item.price?.currency ?? item.currency ?? 'USD';
}

interface CarRentalListProps {
  rentals: CarRentalItem[];
  className?: string;
}

export function CarRentalList({ rentals, className }: CarRentalListProps) {
  const [listExpanded, setListExpanded] = useState(false);

  if (!rentals || rentals.length === 0) return null;

  const total = rentals.length;
  const visibleCount = listExpanded ? total : Math.min(INITIAL_VISIBLE, total);
  const hasMore = total > INITIAL_VISIBLE && !listExpanded;
  const visibleItems = rentals.slice(0, visibleCount);

  return (
    <div className={cn('mt-4', className)}>
      <div
        className="space-y-3 overflow-y-auto pr-1"
        style={{ maxHeight: LIST_MAX_HEIGHT }}
      >
        {visibleItems.map((item, index) => {
          const priceAmount = getPriceAmount(item);
          const priceCurrency = getPriceCurrency(item);
          const vehicleName = item.vehicleName || item.vehicleType || '租车';

          return (
            <Card
              key={item.id ?? index}
              className="border-l-4 border-l-primary/50 hover:shadow-md hover:border-l-primary hover:bg-muted/20 transition-all duration-200"
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="flex flex-col items-center justify-start pt-4 px-4 pb-4 bg-primary/5 border-r border-border/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Car className="w-4.5 h-4.5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 p-4 pl-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm">{vehicleName}</span>
                      {item.supplierName && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {item.supplierName}
                        </Badge>
                      )}
                    </div>
                    {(item.pickupLocation || item.dropoffLocation) && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {item.pickupLocation}
                          {item.dropoffLocation && item.pickupLocation !== item.dropoffLocation
                            ? ` → ${item.dropoffLocation}`
                            : ''}
                        </span>
                      </div>
                    )}
                    {(item.pickupDate || item.dropoffDate) && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {formatDate(item.pickupDate)}
                          {item.dropoffDate && ` — ${formatDate(item.dropoffDate)}`}
                        </span>
                      </div>
                    )}
                    <div className="mt-2.5 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
                      {priceAmount != null && (
                        <span className="text-base font-bold text-primary">
                          {priceAmount} {priceCurrency}
                        </span>
                      )}
                      {item.bookingUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            window.open(item.bookingUrl, '_blank', 'noopener,noreferrer')
                          }
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          预订
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
          className="w-full mt-2 text-xs text-muted-foreground"
          onClick={() => setListExpanded(true)}
        >
          展开更多 ({total - INITIAL_VISIBLE} 条)
        </Button>
      )}
    </div>
  );
}
