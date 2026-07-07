/** 编排行程 · 主视图模式 */
export type ArrangeItineraryViewMode =
  | 'auto'
  | 'by_day'
  | 'timeline'
  | 'list'
  | 'map';

export const ARRANGE_ITINERARY_VIEW_TABS: Array<{
  id: ArrangeItineraryViewMode;
  label: string;
}> = [
  { id: 'auto', label: '自动编排' },
  { id: 'by_day', label: '按天' },
  { id: 'timeline', label: '时间轴' },
  { id: 'list', label: '列表' },
  { id: 'map', label: '地图' },
];

export type ArrangeItineraryAiAction =
  | 'fill_gaps'
  | 'optimize_route'
  | 'arrange_lunch'
  | 'reduce_intensity';

export const ARRANGE_ITINERARY_AI_ACTIONS: Array<{
  id: ArrangeItineraryAiAction;
  label: string;
}> = [
  { id: 'fill_gaps', label: '补全空档' },
  { id: 'optimize_route', label: '优化路线' },
  { id: 'arrange_lunch', label: '安排午餐' },
  { id: 'reduce_intensity', label: '降低强度' },
];
