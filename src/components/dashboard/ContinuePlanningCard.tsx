/**
 * 继续规划卡片组件
 * 显示未完成行程信息，引导用户继续规划
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, ArrowRight, Eye } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { TripDetail } from '@/types/trip';
import { cn } from '@/lib/utils';

interface ContinuePlanningCardProps {
  trip: TripDetail;
  className?: string;
}

export default function ContinuePlanningCard({
  trip,
  className,
}: ContinuePlanningCardProps) {
  const navigate = useNavigate();

  const getCountryName = (destination: string) => {
    return destination.split(',')[0]?.trim() || destination;
  };

  const timeAgo = formatDistanceToNow(new Date(trip.updatedAt || trip.createdAt), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <Card className={cn('border-gray-200 shadow-sm hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                {getCountryName(trip.destination)}
              </h3>
              <Badge variant="secondary" className="text-xs">
                规划中
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(trip.startDate), 'yyyy-MM-dd')}</span>
              </div>
              <span>最后更新：{timeAgo}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/dashboard/plan-studio?tripId=${trip.id}`)}
          >
            继续规划
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/dashboard/trips/${trip.id}`)}
          >
            <Eye className="h-3 w-3 mr-1" />
            查看详情
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
