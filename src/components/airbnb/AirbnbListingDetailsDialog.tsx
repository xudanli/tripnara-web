/**
 * Airbnb 房源详情对话框组件
 * 
 * 展示完整的房源信息，包括照片、设施、评价等
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Star, 
  ExternalLink,
  Home,
  Users,
  Calendar,
  DollarSign,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { airbnbApi } from '@/api/airbnb';
import type { AirbnbListing, AirbnbListingDetailsParams } from '@/api/airbnb';

interface AirbnbListingDetailsDialogProps {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToTrip?: (listing: AirbnbListing) => void;
  searchParams?: {
    checkin?: string;
    checkout?: string;
    adults?: number;
    children?: number;
  };
}

export function AirbnbListingDetailsDialog({
  listingId,
  open,
  onOpenChange,
  searchParams,
  onAddToTrip,
}: AirbnbListingDetailsDialogProps) {
  const [listingDetails, setListingDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (open && listingId) {
      setDetailsLoading(true);
      setDetailsError(null);
      
      const params: AirbnbListingDetailsParams = {
        checkin: searchParams?.checkin,
        checkout: searchParams?.checkout,
        adults: searchParams?.adults,
        children: searchParams?.children,
      };
      
      airbnbApi.getListingDetails(listingId, params)
        .then((details) => {
          setListingDetails(details);
          setDetailsLoading(false);
        })
        .catch((error: any) => {
          setDetailsError(error.message || '获取详情失败');
          setDetailsLoading(false);
        });
    } else {
      setListingDetails(null);
      setCurrentImageIndex(0);
    }
  }, [open, listingId, searchParams]);

  const handlePreviousImage = () => {
    if (listingDetails?.photos && listingDetails.photos.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? listingDetails.photos!.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (listingDetails?.photos && listingDetails.photos.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === listingDetails.photos!.length - 1 ? 0 : prev + 1
      );
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">
            {detailsLoading ? '加载中...' : listingDetails?.name || '房源详情'}
          </DialogTitle>
          <DialogDescription>
            {listingDetails?.location?.address || '查看完整房源信息'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">正在加载房源详情...</p>
            </div>
          ) : detailsError ? (
            <div className="py-12 text-center">
              <p className="text-destructive mb-2">加载失败</p>
              <p className="text-sm text-muted-foreground">{detailsError}</p>
            </div>
          ) : listingDetails ? (
            <div className="space-y-6 pb-6">
              {/* 照片轮播 */}
              {listingDetails.photos && listingDetails.photos.length > 0 && (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={listingDetails.photos[currentImageIndex].url}
                    alt={listingDetails.photos[currentImageIndex].caption || listingDetails.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {listingDetails.photos.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={handlePreviousImage}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                      
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {listingDetails.photos.map((_, idx) => (
                          <button
                            key={idx}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all",
                              idx === currentImageIndex ? "bg-white" : "bg-white/50"
                            )}
                            onClick={() => setCurrentImageIndex(idx)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 基本信息 */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{listingDetails.name}</h3>
                  {listingDetails.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{listingDetails.location.address}</span>
                    </div>
                  )}
                </div>

                {/* 价格 */}
                {listingDetails.price && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {listingDetails.price.currency} {listingDetails.price.total}
                    </span>
                    <span className="text-sm text-muted-foreground">总计</span>
                  </div>
                )}

                {/* 描述 */}
                {listingDetails.description && (
                  <div>
                    <h4 className="font-medium mb-2">关于房源</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {listingDetails.description}
                    </p>
                  </div>
                )}

                <Separator />

                {/* 设施 */}
                {listingDetails.amenities && listingDetails.amenities.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">设施</h4>
                    <div className="flex flex-wrap gap-2">
                      {listingDetails.amenities.map((amenity, idx) => (
                        <Badge key={idx} variant="secondary">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* 房东信息 */}
                {listingDetails.host && (
                  <div>
                    <h4 className="font-medium mb-2">房东</h4>
                    <div className="flex items-center gap-3">
                      {listingDetails.host.avatar && (
                        <img
                          src={listingDetails.host.avatar}
                          alt={listingDetails.host.name}
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">{listingDetails.host.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* 评价 */}
                {listingDetails.reviews && listingDetails.reviews.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">评价</h4>
                    <div className="space-y-4">
                      {listingDetails.reviews.slice(0, 5).map((review, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "w-4 h-4",
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.date).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-sm">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </ScrollArea>

        {/* 底部操作栏 */}
        {listingDetails && (
          <div className="px-6 py-4 border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                window.open(`https://www.airbnb.com/rooms/${listingId}`, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              在 Airbnb 查看
            </Button>
            {onAddToTrip && (
              <Button
                variant="default"
                className="flex-1"
                onClick={() => {
                  // 需要将 listingDetails 转换为 AirbnbListing 格式
                  // 这里简化处理，实际应该从搜索结果中获取完整 listing 对象
                  onAddToTrip({
                    id: listingId,
                    url: `https://www.airbnb.com/rooms/${listingId}`,
                    demandStayListing: {
                      id: '',
                      description: {
                        name: {
                          localizedStringWithTranslationPreference: listingDetails.name,
                        },
                      },
                      location: listingDetails.location ? {
                        coordinate: {
                          latitude: listingDetails.location.latitude,
                          longitude: listingDetails.location.longitude,
                        },
                      } : undefined,
                    },
                    badges: '',
                    structuredContent: {
                      primaryLine: '',
                      secondaryLine: '',
                    },
                    avgRatingA11yLabel: '',
                    structuredDisplayPrice: {
                      primaryLine: {
                        accessibilityLabel: listingDetails.price 
                          ? `${listingDetails.price.currency} ${listingDetails.price.total}`
                          : '',
                      },
                    },
                  });
                }}
              >
                添加到行程
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
