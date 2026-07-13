/** 编排行程 · 主视图模式 */
export type ArrangeItineraryViewMode =
  | 'auto'
  | 'by_day'
  | 'timeline'
  | 'list';

export const ARRANGE_ITINERARY_VIEW_TABS: Array<{
  id: ArrangeItineraryViewMode;
  label: string;
}> = [
  { id: 'auto', label: '自动编排' },
  { id: 'by_day', label: '按天' },
  { id: 'timeline', label: '时间轴' },
  { id: 'list', label: '列表' },
];

export type ArrangeItineraryAiAction =
  | 'fill_gaps'
  | 'optimize_route'
  | 'arrange_lunch'
  | 'reduce_intensity'
  | 'arrange_lodging';

export const ARRANGE_ITINERARY_AI_ACTIONS: Array<{
  id: ArrangeItineraryAiAction;
  label: string;
  /** 缺住宿时高亮推荐 */
  emphasizeWhenLodgingIncomplete?: boolean;
}> = [
  { id: 'fill_gaps', label: '补全空档' },
  { id: 'optimize_route', label: '优化路线' },
  { id: 'arrange_lunch', label: '安排午餐' },
  { id: 'arrange_lodging', label: '补齐住宿', emphasizeWhenLodgingIncomplete: true },
  { id: 'reduce_intensity', label: '降低强度' },
];
