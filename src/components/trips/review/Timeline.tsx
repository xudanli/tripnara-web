import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ExecutionEvent, ReasonTag } from '@/types/trip-review';
import { cn } from '@/lib/utils';

interface TimelineProps {
  events: ExecutionEvent[];
  tripStartDate?: string;
  onEditEvent?: (eventId: string, updates: Partial<ExecutionEvent>) => Promise<void>;
}

export default function Timeline({ events, tripStartDate, onEditEvent }: TimelineProps) {
  // 按 dayIndex 分组事件
  const eventsByDay = events.reduce((acc, event) => {
    if (!acc[event.dayIndex]) {
      acc[event.dayIndex] = [];
    }
    acc[event.dayIndex].push(event);
    return acc;
  }, {} as Record<number, ExecutionEvent[]>);

  const days = Object.keys(eventsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {days.map((dayIndex) => {
        const dayEvents = eventsByDay[dayIndex];
        const date = tripStartDate
          ? new Date(new Date(tripStartDate).getTime() + dayIndex * 24 * 60 * 60 * 1000)
          : null;

        return (
          <DayCard
            key={dayIndex}
            dayIndex={dayIndex}
            date={date}
            events={dayEvents}
            onEditEvent={onEditEvent}
          />
        );
      })}
      {days.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            暂无执行事件数据
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface DayCardProps {
  dayIndex: number;
  date: Date | null;
  events: ExecutionEvent[];
  onEditEvent?: (eventId: string, updates: Partial<ExecutionEvent>) => Promise<void>;
}

function DayCard({ dayIndex, date, events }: DayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [, setEditingEventId] = useState<string | null>(null);

  // 关键事件（最多3条）：风险信号、延误、替换、取消
  const criticalEvents = events.filter(
    (e) =>
      e.type === 'RISK_SIGNAL' ||
      e.type === 'DELAY' ||
      e.type === 'PLAN_ITEM_REPLACED' ||
      e.type === 'PLAN_ITEM_SKIPPED'
  );
  const displayEvents = expanded ? events : criticalEvents.slice(0, 3);
  const hasMore = events.length > 3 && !expanded;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            第 {dayIndex + 1} 天
            {date && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                {format(date, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {events.length} 个事件
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 事件列表 */}
        <div className="space-y-3">
          {displayEvents.map((event) => (
            <EventItem
              key={event.eventId}
              event={event}
              onEdit={() => setEditingEventId(event.eventId)}
            />
          ))}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setExpanded(true)}
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              展开查看全部 {events.length} 个事件
            </Button>
          )}
          {expanded && events.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setExpanded(false)}
            >
              <ChevronUp className="w-4 h-4 mr-2" />
              收起
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EventItemProps {
  event: ExecutionEvent;
  onEdit?: () => void;
}

function EventItem({ event, onEdit }: EventItemProps) {
  const eventTypeConfig = {
    CHECKIN: { icon: MapPin, label: '到达', color: 'text-blue-600 bg-blue-50' },
    CHECKOUT: { icon: MapPin, label: '离开', color: 'text-blue-600 bg-blue-50' },
    PLAN_ITEM_COMPLETED: { icon: CheckCircle2, label: '完成', color: 'text-green-600 bg-green-50' },
    PLAN_ITEM_SKIPPED: { icon: XCircle, label: '取消', color: 'text-red-600 bg-red-50' },
    PLAN_ITEM_REPLACED: { icon: RefreshCw, label: '替换', color: 'text-orange-600 bg-orange-50' },
    DELAY: { icon: Clock, label: '延误', color: 'text-orange-600 bg-orange-50' },
    RISK_SIGNAL: { icon: AlertTriangle, label: '风险', color: 'text-red-600 bg-red-50' },
    BOOKING_FAIL: { icon: XCircle, label: '订座失败', color: 'text-red-600 bg-red-50' },
    REPAIR_ACTION: { icon: RefreshCw, label: '修复', color: 'text-green-600 bg-green-50' },
  };

  const config = eventTypeConfig[event.type] || { icon: Clock, label: event.type, color: 'text-gray-600 bg-gray-50' };
  const Icon = config.icon;

  const timeStr = format(new Date(event.timestampStart), 'HH:mm');
  const timeEndStr = event.timestampEnd ? format(new Date(event.timestampEnd), 'HH:mm') : null;

  const reasonTagLabels: Record<ReasonTag, string> = {
    weather: '天气',
    road: '路况',
    crowd: '拥挤',
    fatigue: '疲劳',
    preference: '偏好',
    cost: '成本',
    time: '时间',
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className={cn('p-2 rounded-lg', config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{config.label}</span>
            <span className="text-xs text-gray-500">
              {timeStr}
              {timeEndStr && ` - ${timeEndStr}`}
            </span>
          </div>
          {onEdit && (
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onEdit}>
              <Edit className="w-3 h-3" />
            </Button>
          )}
        </div>
        {event.impact && (
          <div className="text-xs text-gray-600 mb-2 space-y-1">
            {event.impact.timeDeltaMin !== null && event.impact.timeDeltaMin !== undefined && (
              <div>
                时间: {event.impact.timeDeltaMin > 0 ? '+' : ''}
                {event.impact.timeDeltaMin} 分钟
              </div>
            )}
            {event.impact.distanceDeltaKm !== null && event.impact.distanceDeltaKm !== undefined && (
              <div>
                距离: {event.impact.distanceDeltaKm > 0 ? '+' : ''}
                {event.impact.distanceDeltaKm} 公里
              </div>
            )}
            {event.impact.riskDelta !== null && event.impact.riskDelta !== undefined && (
              <div>
                风险: {event.impact.riskDelta > 0 ? '+' : ''}
                {event.impact.riskDelta}
              </div>
            )}
          </div>
        )}
        {event.reasonTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {event.reasonTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {reasonTagLabels[tag] || tag}
              </Badge>
            ))}
          </div>
        )}
        {event.evidence?.userNote && (
          <div className="text-xs text-gray-600 italic mt-2">
            {event.evidence.userNote}
          </div>
        )}
      </div>
    </div>
  );
}

