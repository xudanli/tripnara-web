/**
 * 未支付费用项列表
 * 
 * 显示行程中所有未支付的费用项，便于追踪待付款
 */

import { useState, useEffect } from 'react';
import { useItineraryCost, formatCost, formatCostCategory } from '@/hooks';
import type { UnpaidItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, DollarSign, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UnpaidItemsListProps {
  tripId: string;
  className?: string;
  onItemClick?: (itemId: string) => void;
}

const COST_CATEGORY_COLORS: Record<string, string> = {
  ACCOMMODATION: 'bg-blue-100 text-blue-800',
  TRANSPORTATION: 'bg-green-100 text-green-800',
  FOOD: 'bg-orange-100 text-orange-800',
  ACTIVITIES: 'bg-purple-100 text-purple-800',
  SHOPPING: 'bg-pink-100 text-pink-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export function UnpaidItemsList({ tripId, className, onItemClick }: UnpaidItemsListProps) {
  const { getUnpaidItems, unpaidLoading, unpaidError } = useItineraryCost();
  const [items, setItems] = useState<UnpaidItem[]>([]);

  const loadItems = async () => {
    const result = await getUnpaidItems(tripId);
    if (result) {
      setItems(result);
    } else if (unpaidError) {
      toast.error(unpaidError);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadItems();
    }
  }, [tripId]);

  if (unpaidLoading && items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="w-6 h-6" />
          <span className="ml-2 text-sm text-muted-foreground">加载未支付项中...</span>
        </CardContent>
      </Card>
    );
  }

  if (unpaidError && items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{unpaidError}</p>
            <Button variant="outline" size="sm" onClick={loadItems}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            未支付费用
          </CardTitle>
          <CardDescription>所有费用已支付</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">恭喜！所有费用都已支付</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalUnpaid = items.reduce((sum, item) => sum + (item.actualCost || item.estimatedCost || 0), 0);
  const currency = items[0]?.currency || 'CNY';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              未支付费用
            </CardTitle>
            <CardDescription>
              {items.length} 项待支付 · 总计 {formatCost(totalUnpaid, currency)}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadItems} disabled={unpaidLoading}>
            <RefreshCw className={cn('w-4 h-4', unpaidLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border p-4 hover:bg-gray-50 transition-colors',
                onItemClick && 'cursor-pointer'
              )}
              onClick={() => onItemClick?.(item.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{item.placeName || '未命名行程项'}</p>
                    {item.costCategory && (
                      <Badge className={COST_CATEGORY_COLORS[item.costCategory] || 'bg-gray-100 text-gray-800'}>
                        {formatCostCategory(item.costCategory)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{format(new Date(item.date), 'yyyy-MM-dd')}</span>
                    {item.costNote && <span>· {item.costNote}</span>}
                  </div>
                </div>
                <div className="text-right">
                  {item.actualCost ? (
                    <>
                      <p className="text-sm font-semibold">
                        {formatCost(item.actualCost, item.currency || 'CNY')}
                      </p>
                      {item.estimatedCost && item.estimatedCost !== item.actualCost && (
                        <p className="text-xs text-muted-foreground line-through">
                          预估: {formatCost(item.estimatedCost, item.currency || 'CNY')}
                        </p>
                      )}
                    </>
                  ) : item.estimatedCost ? (
                    <p className="text-sm font-semibold">
                      {formatCost(item.estimatedCost, item.currency || 'CNY')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default UnpaidItemsList;
