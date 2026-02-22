/**
 * 营业时间卡片组件
 * 优化后的样式结构，显示详细的营业时间信息
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Home, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatOpeningHoursFromObject } from '@/utils/openingHoursFormatter';

interface OpeningHoursData {
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
  weekday?: string;
  weekend?: string;
  [key: string]: any;
}

interface BusinessHoursCardProps {
  title?: string; // 地点名称
  description: string; // 营业时间描述（JSON 字符串或已格式化字符串）
  day?: number; // 行程天数
  className?: string;
  severity?: 'low' | 'medium' | 'high'; // 严重程度（可选）
  source?: string; // 来源（可选）
  timestamp?: string; // 时间戳（可选）
  link?: string; // 链接（可选）
}

const dayLabels: Record<string, { zh: string; en: string }> = {
  mon: { zh: '周一', en: 'Mon' },
  tue: { zh: '周二', en: 'Tue' },
  wed: { zh: '周三', en: 'Wed' },
  thu: { zh: '周四', en: 'Thu' },
  fri: { zh: '周五', en: 'Fri' },
  sat: { zh: '周六', en: 'Sat' },
  sun: { zh: '周日', en: 'Sun' },
};

const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * 解析时间范围字符串，例如 "09:00–17:00"
 */
function parseTimeRange(timeStr: string | null | undefined | number | any): { start: string; end: string } | null {
  // ✅ 防御性检查：确保 timeStr 是有效值
  if (!timeStr) return null;
  
  // ✅ 转换为字符串
  let timeString: string;
  if (typeof timeStr === 'string') {
    timeString = timeStr;
  } else if (typeof timeStr === 'number') {
    // 如果是数字，可能是时间戳，转换为时间字符串
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      timeString = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else {
      return null;
    }
  } else {
    // 其他类型，尝试转换为字符串
    try {
      timeString = String(timeStr);
    } catch {
      return null;
    }
  }
  
  // ✅ 确保 timeString 是字符串且不为空
  if (typeof timeString !== 'string' || !timeString.trim()) {
    return null;
  }
  
  // 支持多种分隔符：–、-、~、到
  const separators = ['–', '-', '~', '到', '至'];
  for (const sep of separators) {
    if (timeString.includes(sep)) {
      try {
        const parts = timeString.split(sep);
        // ✅ 确保 split 返回的是数组
        if (!Array.isArray(parts) || parts.length < 2) {
          continue;
        }
        const [start, end] = parts.map(s => s.trim());
        if (start && end) {
          return { start, end };
        }
      } catch {
        // split 失败，继续尝试下一个分隔符
        continue;
      }
    }
  }
  return null;
}

/**
 * 检查当前时间是否在营业时间范围内
 */
function isCurrentlyOpen(hours: string | null | undefined | number | any): boolean {
  // ✅ 防御性检查
  if (!hours) return false;
  
  // ✅ 转换为字符串进行比较
  let hoursStr: string;
  try {
    hoursStr = typeof hours === 'string' ? hours : String(hours);
    // ✅ 确保转换后的值是字符串
    if (typeof hoursStr !== 'string') {
      return false;
    }
  } catch {
    return false;
  }
  
  // 如果是 24 小时营业
  if (hoursStr === '24小时' || hoursStr === '24 Hours' || hoursStr === '24/7') {
    return true;
  }

  const range = parseTimeRange(hoursStr);
  if (!range) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 简单比较时间字符串（HH:mm 格式）
  return currentTime >= range.start && currentTime <= range.end;
}

/**
 * 获取今天的星期几（小写英文）
 */
function getTodayDay(): string {
  const day = new Date().getDay();
  const dayMap: Record<number, string> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  return dayMap[day] || 'mon';
}

export default function BusinessHoursCard({
  title,
  description,
  day,
  className,
  severity,
  source,
  timestamp,
  link,
}: BusinessHoursCardProps) {
  // 解析营业时间数据
  const hoursData = useMemo<OpeningHoursData | null>(() => {
    if (!description) return null;

    try {
      if (typeof description === 'string') {
        // 尝试提取 JSON 部分（可能包含文本前缀，如 "地点名 营业时间: {...JSON...}"）
        let jsonStr = description.trim();
        
        // 查找 JSON 对象的开始位置（第一个 {）
        const jsonStart = jsonStr.indexOf('{');
        if (jsonStart !== -1) {
          jsonStr = jsonStr.substring(jsonStart);
        }
        
        // 尝试解析 JSON
        try {
          const parsed = JSON.parse(jsonStr);
          // 验证是否是有效的营业时间数据（至少包含一个日期字段）
          if (parsed && typeof parsed === 'object') {
            const hasDayField = dayOrder.some(day => parsed[day]) || parsed.weekday || parsed.weekend || parsed.osmFormat;
            if (hasDayField) {
              return parsed as OpeningHoursData;
            }
          }
        } catch {
          // JSON 解析失败，继续尝试其他方式
        }
        
        // 如果不是 JSON，返回 null，使用原始描述
        return null;
      }
      return description as OpeningHoursData;
    } catch {
      return null;
    }
  }, [description]);

  // 格式化每日时间列表（合并相同营业时间的连续日期）
  const dailyHours = useMemo(() => {
    if (!hoursData) return null;

    // 如果有 osmFormat 且是 "24/7"，特殊处理
    if (hoursData.osmFormat === '24/7' || hoursData.weekday === '24 Hours') {
      const all24Hours = hoursData.osmFormat === '24/7' || 
                         Object.values(hoursData).some(v => v === '24 Hours');
      
      if (all24Hours) {
        // 所有天都是 24 小时营业，合并显示
        return [{
          dayRange: '周一～周日',
          hours: '24小时',
          days: dayOrder,
          isToday: dayOrder.includes(getTodayDay()),
        }];
      }
    }

    // 收集所有天的营业时间
    const allDayHours: Array<{ day: string; label: string; hours: string; isToday: boolean }> = [];

    // 优先使用 weekday/weekend
    if (hoursData.weekday && hoursData.weekend) {
      // ✅ 确保 weekday 和 weekend 是字符串；对象类型用 formatter 避免 [object Object]
      const weekdayStr = typeof hoursData.weekday === 'string'
        ? hoursData.weekday
        : typeof hoursData.weekday === 'object' && hoursData.weekday !== null
          ? formatOpeningHoursFromObject(hoursData.weekday)
          : String(hoursData.weekday || '');
      const weekendStr = typeof hoursData.weekend === 'string'
        ? hoursData.weekend
        : typeof hoursData.weekend === 'object' && hoursData.weekend !== null
          ? formatOpeningHoursFromObject(hoursData.weekend)
          : String(hoursData.weekend || '');
      
      // 工作日
      ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(dayKey => {
        allDayHours.push({
          day: dayKey,
          label: dayLabels[dayKey].zh,
          hours: weekdayStr,
          isToday: dayKey === getTodayDay(),
        });
      });
      // 周末
      ['sat', 'sun'].forEach(dayKey => {
        allDayHours.push({
          day: dayKey,
          label: dayLabels[dayKey].zh,
          hours: weekendStr,
          isToday: dayKey === getTodayDay(),
        });
      });
    } else if (hoursData.weekday) {
      // ✅ 确保 weekday 是字符串；对象类型用 formatter 避免 [object Object]
      const weekdayStr = typeof hoursData.weekday === 'string'
        ? hoursData.weekday
        : typeof hoursData.weekday === 'object' && hoursData.weekday !== null
          ? formatOpeningHoursFromObject(hoursData.weekday)
          : String(hoursData.weekday || '');
      
      // 只有工作日数据，应用到所有工作日
      ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(dayKey => {
        allDayHours.push({
          day: dayKey,
          label: dayLabels[dayKey].zh,
          hours: weekdayStr,
          isToday: dayKey === getTodayDay(),
        });
      });
    } else {
      // 按天解析
      for (const dayKey of dayOrder) {
        const hoursValue = hoursData[dayKey];
        if (hoursValue) {
          // ✅ 确保转换为字符串；对象类型（如 { open, close }）用 formatter 避免 [object Object]
          const hoursStr = typeof hoursValue === 'string'
            ? hoursValue
            : typeof hoursValue === 'object' && hoursValue !== null
              ? formatOpeningHoursFromObject(hoursValue)
              : String(hoursValue || '');
          // 处理 "24 Hours" 格式
          const displayHours = hoursStr === '24 Hours' ? '24小时' : hoursStr;
          allDayHours.push({
            day: dayKey,
            label: dayLabels[dayKey].zh,
            hours: displayHours,
            isToday: dayKey === getTodayDay(),
          });
        }
      }
    }

    if (allDayHours.length === 0) return null;

    // 合并相同营业时间的连续日期
    const mergedHours: Array<{ dayRange: string; hours: string; days: string[]; isToday: boolean }> = [];
    
    for (let i = 0; i < allDayHours.length; i++) {
      const item = allDayHours[i];
      const prevItem = i > 0 ? allDayHours[i - 1] : null;
      
      // 检查是否可以延续上一组（相同时间段且日期连续）
      const canMerge = prevItem && 
                       prevItem.hours === item.hours &&
                       dayOrder.indexOf(prevItem.day) + 1 === dayOrder.indexOf(item.day);
      
      if (canMerge && mergedHours.length > 0) {
        // 延续上一组
        const lastGroup = mergedHours[mergedHours.length - 1];
        lastGroup.dayRange = `${lastGroup.dayRange.split('～')[0]}～${item.label}`;
        lastGroup.days.push(item.day);
        lastGroup.isToday = lastGroup.isToday || item.isToday;
      } else {
        // 开始新组
        mergedHours.push({
          dayRange: item.label,
          hours: item.hours,
          days: [item.day],
          isToday: item.isToday,
        });
      }
    }

    return mergedHours.length > 0 ? mergedHours : null;
  }, [hoursData]);

  // 计算当前营业状态
  const currentStatus = useMemo(() => {
    if (!dailyHours) return null;

    const todayGroup = dailyHours.find(h => h.isToday);
    if (!todayGroup) return null;

    const isOpen = isCurrentlyOpen(todayGroup.hours);
    return {
      isOpen,
      hours: todayGroup.hours,
    };
  }, [dailyHours]);

  // 如果没有解析到数据，显示原始描述
  if (!hoursData || !dailyHours) {
    return (
      <Card className={cn('border-l-4 border-l-blue-500', className)}>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">营业时间</span>
              {day && (
                <Badge variant="outline" className="text-xs">
                  Day {day}
                </Badge>
              )}
            </div>
            {title && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="w-3.5 h-3.5" />
                <span>{title}</span>
              </div>
            )}
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-l-4 border-l-blue-500', className)}>
      <CardContent className="p-4 space-y-3">
        {/* 标题行 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">营业时间</span>
          {severity && (
            <Badge
              variant={
                severity === 'high'
                  ? 'destructive'
                  : severity === 'medium'
                  ? 'default'
                  : 'secondary'
              }
              className="text-xs"
            >
              {severity === 'high' ? '高' : severity === 'medium' ? '中' : '低'}
            </Badge>
          )}
          {day && (
            <Badge variant="outline" className="text-xs">
              Day {day}
            </Badge>
          )}
        </div>

        {/* 地点名称 */}
        {title && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="w-3.5 h-3.5" />
            <span>{title}</span>
          </div>
        )}

        {/* 每日时间列表（合并显示） */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>每日时间：</span>
          </div>
          <div className="space-y-1 pl-5">
            {dailyHours.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center justify-between text-xs',
                  item.isToday && 'font-medium text-blue-700'
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-[80px]">{item.dayRange}</span>
                </span>
                <span
                  className={cn(
                    'font-mono',
                    item.hours === '休息' || item.hours === 'closed' || item.hours === 'Closed'
                      ? 'text-muted-foreground'
                      : 'text-foreground'
                  )}
                >
                  {item.hours === '休息' || item.hours === 'closed' || item.hours === 'Closed'
                    ? '休息'
                    : item.hours}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 当前状态（实时状态，行程日是否营业以行程时间为准） */}
        {currentStatus && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {currentStatus.isOpen ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700">
                  实时状态：营业中
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-muted-foreground">
                  实时状态：已休息（行程日是否营业请参考上方营业时间）
                </span>
              </>
            )}
          </div>
        )}

        {/* 来源、时间戳、链接等额外信息 */}
        {(source || timestamp || link) && (
          <div className="pt-2 border-t space-y-1">
            {source && (
              <div className="text-xs text-muted-foreground">
                来源: {source}
              </div>
            )}
            {timestamp && (
              <div className="text-xs text-muted-foreground">
                {new Date(timestamp).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                查看详情
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

