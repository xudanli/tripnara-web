/**
 * 行程项时间验证工具函数
 * 
 * 用于检测行程项时间重叠、验证时间逻辑等
 */

import type { ItineraryItemDetail } from '@/types/trip';

/**
 * 检测两个时间段是否重叠
 * 
 * @param start1 时间段1开始时间
 * @param end1 时间段1结束时间
 * @param start2 时间段2开始时间
 * @param end2 时间段2结束时间
 * @param allowBoundary 是否允许边界重叠（结束时间 = 开始时间），默认 true
 * @returns 是否重叠
 */
export function isTimeOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
  allowBoundary: boolean = true
): boolean {
  // 确保时间顺序正确
  if (start1 > end1 || start2 > end2) {
    return false; // 无效的时间段
  }

  if (allowBoundary) {
    // 允许边界重叠：只要开始时间 < 结束时间
    // 例如：09:00-11:00 和 11:00-12:00 不重叠（允许）
    return start1 < end2 && start2 < end1;
  } else {
    // 不允许边界重叠：需要严格分离
    // 例如：09:00-11:00 和 11:00-12:00 视为重叠（不允许）
    return start1 < end2 && start2 < end1 && 
           !(end1.getTime() === start2.getTime() || end2.getTime() === start1.getTime());
  }
}

/**
 * 检查新行程项是否与已有行程项重叠
 * 
 * @param newItem 新行程项（包含 startTime 和 endTime）
 * @param existingItems 已有行程项列表
 * @param allowBoundary 是否允许边界重叠，默认 true
 * @returns 重叠的行程项列表
 */
export function checkTimeOverlap(
  newItem: { startTime: Date | string; endTime: Date | string },
  existingItems: Array<{ 
    id: string; 
    startTime: string; 
    endTime: string; 
    note?: string | null;
    type?: string;
    Place?: { nameCN?: string; nameEN?: string };
  }>,
  allowBoundary: boolean = true
): Array<{ 
  id: string; 
  startTime: string; 
  endTime: string; 
  note?: string | null;
  type?: string;
  Place?: { nameCN?: string; nameEN?: string };
}> {
  const overlaps: typeof existingItems = [];
  
  // 确保 newItem 的时间是 Date 对象
  const newStart = typeof newItem.startTime === 'string' 
    ? new Date(newItem.startTime) 
    : newItem.startTime;
  const newEnd = typeof newItem.endTime === 'string' 
    ? new Date(newItem.endTime) 
    : newItem.endTime;

  // 验证新项的时间有效性
  if (newStart >= newEnd) {
    return overlaps; // 无效的时间段，不检查重叠
  }

  for (const item of existingItems) {
    // 跳过没有时间的项
    if (!item.startTime || !item.endTime) {
      continue;
    }

    const itemStart = new Date(item.startTime);
    const itemEnd = new Date(item.endTime);

    // 验证已有项的时间有效性
    if (itemStart >= itemEnd) {
      continue; // 跳过无效的时间段
    }

    // 调试日志：检查时间比较
    const isOverlapping = isTimeOverlap(newStart, newEnd, itemStart, itemEnd, allowBoundary);
    
    if (isOverlapping) {
      console.log('[checkTimeOverlap] 检测到重叠:', {
        newItem: {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
        },
        existingItem: {
          id: item.id,
          start: itemStart.toISOString(),
          end: itemEnd.toISOString(),
          startTime: item.startTime,
          endTime: item.endTime,
        },
        comparison: {
          condition1: `${newStart.toISOString()} < ${itemEnd.toISOString()} = ${newStart < itemEnd}`,
          condition2: `${itemStart.toISOString()} < ${newEnd.toISOString()} = ${itemStart < newEnd}`,
          allowBoundary,
        },
      });
      overlaps.push(item);
    }
  }

  return overlaps;
}

/**
 * 格式化时间重叠错误消息
 * 
 * @param overlaps 重叠的行程项列表
 * @returns 格式化的错误消息
 */
export function formatTimeOverlapError<T extends { 
  startTime: string; 
  endTime: string; 
  note?: string | null;
  type?: string;
  Place?: { nameCN?: string; nameEN?: string } | null;
}>(
  overlaps: T[]
): string {
  if (overlaps.length === 0) {
    return '';
  }

  const formatTime = (timeStr: string): string => {
    const date = new Date(timeStr);
    // 使用 UTC 时间显示，避免时区转换导致的显示错误
    // 因为行程项的时间都是 UTC 格式存储的
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getItemName = (item: typeof overlaps[0]): string => {
    if (item.Place) {
      return item.Place.nameCN || item.Place.nameEN || '未知地点';
    }
    if (item.note) {
      return item.note;
    }
    return '行程项';
  };

  if (overlaps.length === 1) {
    const item = overlaps[0];
    return `时间与已有行程项冲突：${formatTime(item.startTime)} - ${formatTime(item.endTime)} ${getItemName(item)}`;
  }

  const conflictList = overlaps
    .map(item => `• ${formatTime(item.startTime)} - ${formatTime(item.endTime)} ${getItemName(item)}`)
    .join('\n');

  return `时间与以下 ${overlaps.length} 个行程项冲突：\n${conflictList}`;
}

/**
 * 查找可用时间段
 * 
 * 在已有行程项之间查找可用的时间段
 * 
 * @param existingItems 已有行程项列表（按时间排序）
 * @param durationMinutes 需要的时长（分钟）
 * @param dayStart 一天的开始时间（默认 06:00）
 * @param dayEnd 一天的结束时间（默认 23:00）
 * @param bufferMinutes 缓冲时间（分钟），默认 15
 * @returns 可用时间段列表
 */
export function findAvailableTimeSlots(
  existingItems: Array<{ startTime: string; endTime: string }>,
  durationMinutes: number,
  dayStart: string = '06:00',
  dayEnd: string = '23:00',
  bufferMinutes: number = 15
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];

  // 解析时间字符串（格式：HH:mm）
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes; // 转换为分钟数
  };

  // 格式化分钟数为时间字符串
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const dayStartMinutes = parseTime(dayStart);
  const dayEndMinutes = parseTime(dayEnd);
  const totalDuration = durationMinutes + bufferMinutes * 2; // 包含前后缓冲

  // 如果没有已有项，返回整个时间段
  if (existingItems.length === 0) {
    if (dayEndMinutes - dayStartMinutes >= totalDuration) {
      slots.push({
        start: dayStart,
        end: formatTime(dayStartMinutes + durationMinutes),
      });
    }
    return slots;
  }

  // 按开始时间排序
  const sortedItems = [...existingItems].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // 检查第一个项之前的时间段
  const firstItemStart = new Date(sortedItems[0].startTime);
  const firstItemStartMinutes = firstItemStart.getHours() * 60 + firstItemStart.getMinutes();
  
  if (firstItemStartMinutes - dayStartMinutes >= totalDuration) {
    slots.push({
      start: dayStart,
      end: formatTime(dayStartMinutes + durationMinutes),
    });
  }

  // 检查项之间的时间段
  for (let i = 0; i < sortedItems.length - 1; i++) {
    const currentItemEnd = new Date(sortedItems[i].endTime);
    const nextItemStart = new Date(sortedItems[i + 1].startTime);
    
    const currentEndMinutes = currentItemEnd.getHours() * 60 + currentItemEnd.getMinutes();
    const nextStartMinutes = nextItemStart.getHours() * 60 + nextItemStart.getMinutes();
    
    const gap = nextStartMinutes - currentEndMinutes;
    
    if (gap >= totalDuration) {
      const slotStart = formatTime(currentEndMinutes + bufferMinutes);
      slots.push({
        start: slotStart,
        end: formatTime(currentEndMinutes + bufferMinutes + durationMinutes),
      });
    }
  }

  // 检查最后一个项之后的时间段
  const lastItemEnd = new Date(sortedItems[sortedItems.length - 1].endTime);
  const lastItemEndMinutes = lastItemEnd.getHours() * 60 + lastItemEnd.getMinutes();
  
  if (dayEndMinutes - lastItemEndMinutes >= totalDuration) {
    const slotStart = formatTime(lastItemEndMinutes + bufferMinutes);
    slots.push({
      start: slotStart,
      end: formatTime(lastItemEndMinutes + bufferMinutes + durationMinutes),
    });
  }

  return slots;
}
