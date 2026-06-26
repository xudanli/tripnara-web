import type {
  WishCategory,
  WishInputMode,
  WishVisibility,
  TeamWishItem,
  TripWishItem,
  WishCategoryOption,
} from '@/types/trip-wishes';

export type { WishCategory, WishVisibility, WishInputMode, TripWishItem, TeamWishItem };

/** @deprecated 使用 WishCategory */
export type WishDomain = WishCategory;

/** API 不可用时的静态兜底（与后端默认 zh-CN 一致） */
export const WISH_CATEGORY_LABELS: Record<WishCategory, string> = {
  destination_route: '目的地与路线',
  main_transport: '大交通与接驳',
  accommodation: '住宿方案',
  activities: '活动与体验',
  dining: '餐饮选择',
  local_transport: '当地交通（租车）',
  shopping: '购物',
  insurance_visa: '保险与签证',
};

/** @deprecated 使用 WISH_CATEGORY_LABELS */
export const WISH_DOMAIN_LABELS = WISH_CATEGORY_LABELS;

export const WISH_VISIBILITY_LABELS: Record<WishVisibility, string> = {
  private: '私密',
  anonymous: '匿名',
  signed: '署名',
};

export const WISH_VISIBILITY_HINTS: Record<WishVisibility, string> = {
  private: '仅你和 AI 可见',
  anonymous: '团队可见，不显示作者',
  signed: '团队可见，显示昵称',
};

export function teamWallWishLabel(
  wish: Pick<TripWishItem | TeamWishItem, 'visibility'>,
  displayName?: string,
): string {
  if (wish.visibility === 'signed' && displayName) {
    return `${displayName} 希望`;
  }
  if (wish.visibility === 'anonymous') {
    return '有人希望';
  }
  return '仅 AI 可见';
}

export function categoryLabel(
  value: WishCategory | string,
  options?: WishCategoryOption[],
): string {
  const fromApi = options?.find((o) => o.value === value)?.label;
  if (fromApi) return fromApi;
  return WISH_CATEGORY_LABELS[value as WishCategory] ?? value;
}

export function categoryLabelFor(
  wish: Pick<TripWishItem, 'category'> | Pick<TeamWishItem, 'category' | 'categoryLabel'>,
  options?: WishCategoryOption[],
): string {
  if ('categoryLabel' in wish && wish.categoryLabel) {
    return wish.categoryLabel;
  }
  return categoryLabel(wish.category, options);
}

export function importanceLevel(n: number): 1 | 2 | 3 | 4 | 5 {
  const clamped = Math.min(5, Math.max(1, Math.round(n)));
  return clamped as 1 | 2 | 3 | 4 | 5;
}
