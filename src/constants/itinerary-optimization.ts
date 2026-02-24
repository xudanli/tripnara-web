/**
 * 行程优化模块常量配置
 */

// 节奏因子配置
export const PACING_FACTOR = {
  MIN: 0.7, // 快节奏（特种兵模式）
  DEFAULT: 1.0, // 标准节奏
  MAX: 1.5, // 慢节奏
  STEP: 0.1, // 滑块步长
} as const;

// 默认时间配置
export const DEFAULT_TIMES = {
  START_HOUR: 9,
  START_MINUTE: 0,
  END_HOUR: 18,
  END_MINUTE: 0,
  LUNCH_START: '12:00',
  LUNCH_END: '13:30',
  DINNER_START: '18:00',
  DINNER_END: '20:00',
} as const;

// 地点推荐配置
export const PLACE_RECOMMENDATIONS = {
  DEFAULT_LIMIT: 100, // 默认获取地点数量
  MAX_LIMIT: 100, // 最大获取地点数量（根据API文档）
} as const;

// 时间格式
export const TIME_FORMAT = {
  ISO_SUFFIX: '00.000Z', // ISO 8601 时间后缀
  DISPLAY_FORMAT: 'HH:mm', // 显示格式
  DATETIME_FORMAT: 'yyyy-MM-dd HH:mm', // 日期时间格式
} as const;

// 强度等级显示文本
export const INTENSITY_LABELS = {
  HIGH: '高强度',
  MEDIUM: '中等',
  LOW: '低强度',
} as const;

// 节奏因子显示文本
export const PACING_FACTOR_LABELS = {
  FAST: '快节奏（特种兵）',
  NORMAL: '标准节奏',
  SLOW: '慢节奏',
} as const;

// 交通方式（优化接口）
export const TRAVEL_MODE_OPTIONS = [
  { value: undefined, label: '自动（根据人员组成）' },
  { value: 'TRANSIT' as const, label: '公交' },
  { value: 'WALKING' as const, label: '步行' },
  { value: 'DRIVING' as const, label: '自驾' },
] as const;

// 行程 travelMode 映射到优化接口 defaultTravelMode
export const TRIP_TRAVEL_MODE_MAP: Record<string, 'TRANSIT' | 'WALKING' | 'DRIVING'> = {
  self_drive: 'DRIVING',
  public_transit: 'TRANSIT',
  walking: 'WALKING',
  DRIVING: 'DRIVING',
  TRANSIT: 'TRANSIT',
  WALKING: 'WALKING',
};

