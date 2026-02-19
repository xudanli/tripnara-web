/**
 * 营业时间格式化工具
 * 将营业时间数据格式化为友好的显示格式
 */

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
  osmFormat?: string;
  [key: string]: any;
}

/**
 * 将时间段合并为范围显示
 * 例如：周一、周二、周三都是 09:30-20:30 → "周一～周三: 09:30-20:30"
 */
function formatOpeningHours(hoursData: OpeningHoursData): string {
  // 如果有 osmFormat，优先使用
  if (hoursData.osmFormat) {
    return hoursData.osmFormat;
  }

  // 如果有 weekday 和 weekend，且不同，则分别显示
  if (hoursData.weekday && hoursData.weekend) {
    if (hoursData.weekday === hoursData.weekend) {
      return hoursData.weekday;
    }
    return `工作日: ${hoursData.weekday} | 周末: ${hoursData.weekend}`;
  }

  // 如果有 weekday 或 weekend，直接使用
  if (hoursData.weekday) {
    return hoursData.weekday;
  }
  if (hoursData.weekend) {
    return hoursData.weekend;
  }

  // 按天解析并合并相同时间段
  const dayLabels: Record<string, string> = {
    mon: '周一',
    tue: '周二',
    wed: '周三',
    thu: '周四',
    fri: '周五',
    sat: '周六',
    sun: '周日',
  };

  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  // 收集每天的时间段
  const dayHours: Array<{ day: string; label: string; hours: string }> = [];
  for (const day of dayOrder) {
    if (hoursData[day]) {
      dayHours.push({
        day,
        label: dayLabels[day],
        hours: hoursData[day],
      });
    }
  }

  if (dayHours.length === 0) {
    return '营业时间未知';
  }

  // 如果所有天都一样，直接返回
  const allSame = dayHours.every((item) => item.hours === dayHours[0].hours);
  if (allSame) {
    return dayHours[0].hours;
  }

  // 合并相同时间段的连续日期
  const groups: Array<{ start: string; end: string; hours: string }> = [];
  
  for (let i = 0; i < dayHours.length; i++) {
    const item = dayHours[i];
    const prevItem = i > 0 ? dayHours[i - 1] : null;
    
    // 检查是否可以延续上一组（相同时间段且日期连续）
    const canMerge = prevItem && 
                     prevItem.hours === item.hours &&
                     dayOrder.indexOf(prevItem.day) + 1 === dayOrder.indexOf(item.day);
    
    if (canMerge && groups.length > 0) {
      // 延续上一组
      const lastGroup = groups[groups.length - 1];
      lastGroup.end = item.label;
    } else {
      // 开始新组
      groups.push({
        start: item.label,
        end: item.label,
        hours: item.hours,
      });
    }
  }

  // 格式化输出
  return groups
    .map((group) => {
      if (group.start === group.end) {
        return `${group.start}: ${group.hours}`;
      }
      return `${group.start}～${group.end}: ${group.hours}`;
    })
    .join(' | ');
}

/**
 * 将营业时间对象格式化为可读字符串
 * 支持多种格式：{ open, close }、Record<day, string>、{ text }、weekday/weekend 等
 */
export function formatOpeningHoursFromObject(hours: unknown): string {
  if (hours == null) return '营业时间未知';
  if (typeof hours === 'string') return hours;
  if (typeof hours !== 'object') return String(hours);

  const h = hours as Record<string, unknown>;
  if (h.text && typeof h.text === 'string') return h.text;
  if (h.osmFormat && typeof h.osmFormat === 'string') return h.osmFormat;
  if (h.open && h.close) return `${h.open} - ${h.close}`;
  if (h.weekday && typeof h.weekday === 'string') {
    return h.weekend && h.weekend !== h.weekday
      ? `工作日: ${h.weekday} | 周末: ${h.weekend}`
      : String(h.weekday);
  }
  if (h.weekend && typeof h.weekend === 'string') return String(h.weekend);

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayLabels: Record<string, string> = {
    monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四',
    friday: '周五', saturday: '周六', sunday: '周日',
    mon: '周一', tue: '周二', wed: '周三', thu: '周四',
    fri: '周五', sat: '周六', sun: '周日',
  };
  const values: string[] = [];
  for (const k of dayKeys) {
    if (h[k] && typeof h[k] === 'string') {
      values.push(`${dayLabels[k] || k}: ${h[k]}`);
    }
  }
  if (values.length > 0) return values.join(' | ');
  return '营业时间未知';
}

/**
 * 格式化校验消息中的 [object Object]，用 details 中的营业时间替换
 */
export function formatValidationMessage(
  message: string,
  details?: Record<string, unknown> | null
): string {
  if (!message.includes('[object Object]')) return message;
  const hours = details?.openingHours ?? details?.businessHours ?? details?.hours;
  const formatted = hours != null ? formatOpeningHoursFromObject(hours) : '营业时间未知';
  return message.replace(/营业时间:\s*\[object Object\]/g, `营业时间: ${formatted}`);
}

/**
 * 格式化营业时间描述
 * @param description 原始描述（可能是 JSON 字符串）
 * @returns 格式化后的字符串
 */
export function formatOpeningHoursDescription(description: string): string {
  if (!description) {
    return '';
  }

  // 尝试解析 JSON
  try {
    // 如果已经是对象，直接使用；否则尝试解析字符串
    let hoursData: OpeningHoursData;
    if (typeof description === 'string') {
      hoursData = JSON.parse(description);
    } else {
      hoursData = description as OpeningHoursData;
    }
    return formatOpeningHours(hoursData);
  } catch (e) {
    // 如果不是 JSON，检查是否已经是格式化后的字符串
    // 如果包含 "Mo-Su" 或 "24/7" 等格式，直接返回
    if (description.includes('Mo-Su') || description.includes('24/7') || description.includes('～')) {
      return description;
    }
    // 否则返回原始描述
    return description;
  }
}

