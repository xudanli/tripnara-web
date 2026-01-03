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

export default function ChecklistSection({ title, items, level, className, tripStartDate }: ChecklistSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

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
          {items.map((item, index) => (
            <div key={index} className="space-y-2 p-3 border rounded-lg">
              <p className="text-sm">{item.message}</p>
              
              {/* Tasks */}
              {item.tasks && item.tasks.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-medium text-muted-foreground">任务:</h5>
                  <ul className="space-y-1">
                    {item.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-muted-foreground/50 mt-1">•</span>
                        <span className="flex-1">
                          {task.title}
                          {tripStartDate && task.dueOffsetDays !== undefined && (
                            <span className="text-muted-foreground/70 ml-2">
                              (截止: {calculateDeadline(task.dueOffsetDays, tripStartDate)})
                            </span>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <span className="ml-2">
                              {task.tags.map((tag, tagIdx) => (
                                <Badge key={tagIdx} variant="outline" className="text-xs mr-1">
                                  {tag}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Evidence */}
              {item.evidence && item.evidence.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-medium text-muted-foreground">证据:</h5>
                  <ul className="space-y-1">
                    {item.evidence.map((ev, evIndex) => (
                      <li key={evIndex} className="text-xs text-muted-foreground">
                        {ev.sourceId}
                        {ev.sectionId && ` > ${ev.sectionId}`}
                        {ev.quote && (
                          <span className="text-muted-foreground/70 italic">
                            : "{ev.quote}"
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
