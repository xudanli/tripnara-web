import type { GapType } from '@/api/trip-planner';

/**
 * 获取缺口类型的中文标签
 */
export const getGapTypeLabel = (type: GapType): string => {
  const labels: Record<GapType, string> = {
    MEAL: '用餐',
    TRANSPORT: '交通',
    HOTEL: '住宿',
    ACTIVITY: '活动',
    FREE_TIME: '空档时间',
  };
  return labels[type] || type;
};

/**
 * 获取缺口类型的所有选项
 */
export const GAP_TYPE_OPTIONS: Array<{ value: GapType; label: string }> = [
  { value: 'MEAL', label: '用餐' },
  { value: 'TRANSPORT', label: '交通' },
  { value: 'HOTEL', label: '住宿' },
  { value: 'ACTIVITY', label: '活动' },
  { value: 'FREE_TIME', label: '空档时间' },
];
