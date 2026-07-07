/**
 * 解析进度页 UI 预览数据（仅 DEV + ?preview=parsing）
 */

import type { GuideBundleSummary, GuideSource } from '@/types/guide-import';

export const PARSING_PREVIEW_SOURCES: GuideSource[] = [
  {
    id: 'preview_guide_1',
    type: 'text',
    title: '冰岛冬季自驾全攻略',
    rawText: 'x'.repeat(8452),
    addedAt: new Date().toISOString(),
  },
  {
    id: 'preview_guide_2',
    type: 'file',
    title: 'Iceland_Winter_Travel.pdf',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'preview_guide_3',
    type: 'link',
    title: '小红书笔记合集（15篇）',
    url: 'https://www.xiaohongshu.com/explore/preview',
    addedAt: new Date().toISOString(),
  },
];

export const PARSING_PREVIEW_SUMMARY: GuideBundleSummary = {
  guideIds: [],
  themeSummary: '南岸自然景观 · 极光 · 冰河湖 · 黑沙滩',
  places: [],
  restaurants: [],
  accommodations: [],
  tips: [],
  claims: [],
  routes: [],
  riskHints: [],
  unmatchedPlaceNames: [],
  stats: {
    placeCount: 18,
    restaurantCount: 5,
    accommodationCount: 4,
    tipCount: 7,
    riskCount: 3,
  },
};

export const PARSING_PREVIEW_TAGS = ['自驾', '冬季', '极光', '黑沙滩', '冰川湖'];

export function isParsingPreviewMode(searchParams: URLSearchParams): boolean {
  return import.meta.env.DEV && searchParams.get('preview') === 'parsing';
}
