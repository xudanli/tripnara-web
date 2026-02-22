export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/** 将日期格式化为 yyyy-MM-dd，兼容 string | Date，避免显示原始 ISO */
export const formatDayDate = (date: string | Date | undefined): string => {
  if (date == null) return '—';
  const dateStr = typeof date === 'string' ? date : (date instanceof Date ? date.toISOString() : '');
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return dateStr.slice(0, 10) || '—';
  }
};

export const formatCurrency = (
  amount: number, 
  currency: string = 'CNY', 
  locale?: string
): string => {
  // 使用浏览器默认locale，如果没有提供
  const defaultLocale = locale || navigator.language || 'zh-CN';
  return new Intl.NumberFormat(defaultLocale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

export const formatDuration = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

