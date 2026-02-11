/**
 * 体能时间线组件
 * 显示用户体能相关事件的时间线
 * 
 * @module components/fitness/FitnessTimeline
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { History, FileText, Target, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useFitnessTimeline } from '@/hooks/useFitnessTimeline';
import type { TimelineEvent, TimelineEventType } from '@/types/fitness-analytics';
import { TIMELINE_EVENT_CONFIG } from '@/types/fitness-analytics';

interface FitnessTimelineProps {
  limit?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

function EventIcon({ type }: { type: TimelineEventType }) {
  switch (type) {
    case 'TRIP_FEEDBACK':
      return <FileText className="w-4 h-4" />;
    case 'CALIBRATION':
      return <Target className="w-4 h-4" />;
    case 'QUESTIONNAIRE':
      return <ClipboardList className="w-4 h-4" />;
    default:
      return <History className="w-4 h-4" />;
  }
}

function formatEventDetails(event: TimelineEvent): string {
  const details = event.details;
  
  switch (event.event) {
    case 'TRIP_FEEDBACK':
      const rating = details.rating as number;
      const ratingLabels = ['', '太累了', '刚刚好', '还能再走'];
      return `评分：${ratingLabels[rating] || rating}`;
    case 'CALIBRATION':
      const factor = details.factor as number;
      const change = ((factor - 1) * 100).toFixed(1);
      return `调整 ${Number(change) >= 0 ? '+' : ''}${change}%`;
    case 'QUESTIONNAIRE':
      return '完成体能评估问卷';
    default:
      return '';
  }
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const config = TIMELINE_EVENT_CONFIG[event.event];
  
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          'bg-muted text-muted-foreground',
          config.colorClass
        )}>
          <EventIcon type={event.event} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-muted my-1" />
        )}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{config.label}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(event.date), 'MM月dd日 HH:mm', { locale: zhCN })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {formatEventDetails(event)}
        </p>
      </div>
    </div>
  );
}

export function FitnessTimeline({
  limit = 10,
  collapsible = true,
  defaultCollapsed = false,
  className,
}: FitnessTimelineProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [displayLimit, setDisplayLimit] = useState(5);
  const { data: events, isLoading, error } = useFitnessTimeline(limit);

  const displayedEvents = events?.slice(0, displayLimit) || [];
  const hasMore = (events?.length || 0) > displayLimit;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-5 h-5" />
              体能时间线
            </CardTitle>
            <CardDescription>您的体能变化历史记录</CardDescription>
          </div>
          {collapsible && events && events.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <>展开 <ChevronDown className="w-4 h-4 ml-1" /></>
              ) : (
                <>收起 <ChevronUp className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              加载时间线失败
            </div>
          ) : !events || events.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                暂无体能相关记录
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                完成问卷或提交行程反馈后，记录会显示在这里
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-0">
                {displayedEvents.map((event, index) => (
                  <TimelineItem
                    key={index}
                    event={event}
                    isLast={index === displayedEvents.length - 1}
                  />
                ))}
              </div>
              
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setDisplayLimit(prev => prev + 5)}
                >
                  加载更多
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default FitnessTimeline;
