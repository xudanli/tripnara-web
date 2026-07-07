const FALLBACK_LOCALE = 'zh-CN';
const FALLBACK_CURRENCY = 'CNY';

function resolveLocale(locale?: string): string {
  const candidate =
    locale?.trim() ||
    (typeof navigator !== 'undefined' ? navigator.language?.trim() : '') ||
    FALLBACK_LOCALE;
  try {
    new Intl.NumberFormat(candidate).format(0);
    return candidate;
  } catch {
    return FALLBACK_LOCALE;
  }
}

function resolveCurrency(currency?: string): string {
  const code = (currency?.trim() || FALLBACK_CURRENCY).toUpperCase();
  try {
    new Intl.NumberFormat(FALLBACK_LOCALE, { style: 'currency', currency: code }).format(0);
    return code;
  } catch {
    return FALLBACK_CURRENCY;
  }
}

export const formatDate = (date: string | Date, locale?: string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const defaultLocale = resolveLocale(locale);
  return d.toLocaleDateString(defaultLocale, {
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
  currency: string = FALLBACK_CURRENCY, 
  locale?: string
): string => {
  const defaultLocale = resolveLocale(locale);
  const safeCurrency = resolveCurrency(currency);
  return new Intl.NumberFormat(defaultLocale, {
    style: 'currency',
    currency: safeCurrency,
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

