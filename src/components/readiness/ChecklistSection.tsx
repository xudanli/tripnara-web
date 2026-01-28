import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadinessFindingItem } from '@/api/readiness';

interface ChecklistSectionProps {
  title: string;
  items: ReadinessFindingItem[];
  level: 'must' | 'should' | 'optional';
  className?: string;
  tripStartDate?: string | Date; // 用于计算任务截止日期
  trip?: { TripDay?: Array<{ date: string; ItineraryItem?: Array<{ id: string; Place?: { name?: string } | null }> }> } | null; // 行程数据，用于关联活动
}

// 计算截止日期
function calculateDeadline(offsetDays: number, tripStartDate: string | Date): string {
  const startDate = typeof tripStartDate === 'string' ? new Date(tripStartDate) : tripStartDate;
  const deadline = new Date(startDate);
  deadline.setDate(deadline.getDate() + offsetDays);
  return deadline.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ChecklistSection({ title, items, level, className, tripStartDate, trip }: ChecklistSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  // 根据 affectedDays 获取关联的活动信息
  const getAssociatedActivities = (item: ReadinessFindingItem & { affectedDays?: number[] }): string[] => {
    const activities: string[] = [];
    if (item.affectedDays && item.affectedDays.length > 0 && trip?.TripDay) {
      item.affectedDays.forEach(dayNum => {
        // dayNum 是从1开始的，需要找到对应的 TripDay（按索引匹配）
        const tripDay = trip?.TripDay?.[dayNum - 1];
        
        if (tripDay) {
          const dateStr = tripDay.date 
            ? new Date(tripDay.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) 
            : `第${dayNum}天`;
          
          if (tripDay.ItineraryItem && tripDay.ItineraryItem.length > 0) {
            const placeNames = tripDay.ItineraryItem
              .map(itineraryItem => itineraryItem.Place?.name)
              .filter((name): name is string => Boolean(name))
              .slice(0, 3); // 最多显示3个地点
            if (placeNames.length > 0) {
              activities.push(`${dateStr}: ${placeNames.join('、')}`);
            } else {
              activities.push(dateStr);
            }
          } else {
            activities.push(dateStr);
          }
        } else {
          // 如果找不到对应的日期，至少显示天数
          activities.push(`第${dayNum}天`);
        }
      });
    }
    return activities;
  };

  const levelConfig = {
    must: {
      icon: AlertCircle,
      iconClassName: 'text-red-600',
      badgeClassName: 'bg-red-100 text-red-800 border-red-200',
      badgeLabel: 'Must',
    },
    should: {
      icon: CheckCircle2,
      iconClassName: 'text-orange-600',
      badgeClassName: 'bg-orange-100 text-orange-800 border-orange-200',
      badgeLabel: 'Should',
    },
    optional: {
      icon: Info,
      iconClassName: 'text-blue-600',
      badgeClassName: 'bg-blue-100 text-blue-800 border-blue-200',
      badgeLabel: 'Optional',
    },
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={cn('h-5 w-5', config.iconClassName)} />
          {title}
          <Badge variant="outline" className={cn('text-xs', config.badgeClassName)}>
            {config.badgeLabel}
          </Badge>
          <span className="text-sm text-muted-foreground font-normal">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => {
            const associatedActivities = getAssociatedActivities(item as ReadinessFindingItem & { affectedDays?: number[] });
            return (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <p className="text-sm">{item.message}</p>
                
                {/* 关联的活动信息 */}
                {associatedActivities.length > 0 && (
                  <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-muted-foreground flex-shrink-0">关联活动:</span>
                    <div className="flex flex-wrap gap-1">
                      {associatedActivities.map((activity, actIndex) => (
                        <Badge key={actIndex} variant="outline" className="text-xs">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tasks */}
                {item.tasks && item.tasks.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">任务:</h5>
                    <ul className="space-y-1">
                      {/* 根据后端文档，tasks 是字符串数组 */}
                      {(Array.isArray(item.tasks) ? item.tasks : []).map((task, taskIndex) => {
                        // 兼容处理：如果是字符串，直接显示；如果是对象，显示 title 和 deadline
                        if (typeof task === 'string') {
                          return (
                            <li key={taskIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-muted-foreground/50 mt-1">•</span>
                              <span className="flex-1">{task}</span>
                            </li>
                          );
                        } else {
                          // 兼容旧格式（对象）
                          const taskObj = task as any;
                          const taskText = taskObj.title || String(task);
                          const deadline = tripStartDate && taskObj.dueOffsetDays !== undefined 
                            ? calculateDeadline(taskObj.dueOffsetDays, tripStartDate)
                            : null;
                          return (
                            <li key={taskIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-muted-foreground/50 mt-1">•</span>
                              <span className="flex-1">
                                {taskText}
                                {deadline && (
                                  <span className="text-muted-foreground/70 ml-2">
                                    (截止: {deadline})
                                  </span>
                                )}
                                {taskObj.tags && taskObj.tags.length > 0 && (
                                  <span className="ml-2">
                                    {taskObj.tags.map((tag: string, tagIdx: number) => (
                                      <Badge key={tagIdx} variant="outline" className="text-xs mr-1">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        }
                      })}
                    </ul>
                  </div>
                )}
                
                {/* Evidence */}
                {/* 根据后端文档，evidence 是字符串 */}
                {item.evidence && (
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">证据:</h5>
                    <div className="text-xs text-muted-foreground">
                      {typeof item.evidence === 'string' 
                        ? item.evidence 
                        : Array.isArray(item.evidence) 
                        ? (item.evidence as unknown as any[]).map((ev: any, evIndex: number) => (
                            <div key={evIndex}>
                              {ev.sourceId}
                              {ev.sectionId && ` > ${ev.sectionId}`}
                              {ev.quote && (
                                <span className="text-muted-foreground/70 italic">
                                  : "{ev.quote}"
                                </span>
                              )}
                            </div>
                          ))
                        : String(item.evidence)}
                    </div>
                  </div>
                )}
                
                {/* Ask User - 需要询问用户的问题 */}
                {item.askUser && item.askUser.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">需要确认:</h5>
                    <ul className="space-y-1">
                      {item.askUser.map((question, qIndex) => (
                        <li key={qIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-muted-foreground/50 mt-1">?</span>
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
