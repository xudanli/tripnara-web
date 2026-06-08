import type { PlazaFeedItem, RecruitmentPostCard, VerifiedCredentials } from '@/types/match-square';
import type { OdysseyCognitiveScores } from '@/types/odyssey-travel-persona';
import { enrichPostMatchInsights } from './match-enrichment';
import { buildPlazaFeedWithFlash } from './match-flash';
import { isOwnRecruitmentPost } from './mock-data';
import { isPostVisibleInPlaza } from './verified-credentials';
import type { MatchTripWindow } from './match-engine';
import type { ViewerSlotProfile } from './slot-filling';

export type PlazaEnrichContext = {
  viewerScores: OdysseyCognitiveScores | null;
  viewerCredentials?: VerifiedCredentials | null;
  viewerMbtiType?: string;
  memberTrip?: MatchTripWindow | null;
};

function enrichPost(
  post: RecruitmentPostCard,
  ctx: PlazaEnrichContext
): RecruitmentPostCard {
  return enrichPostMatchInsights(
    post,
    ctx.viewerScores,
    ctx.viewerCredentials,
    ctx.viewerMbtiType,
    ctx.memberTrip
  );
}

/** 对混合流中的 post 条目做客户端 Match Engine enrich */
export function enrichPlazaFeedItems(
  feedItems: PlazaFeedItem[],
  ctx: PlazaEnrichContext
): PlazaFeedItem[] {
  return feedItems.map((item) => {
    const post = enrichPost(item.post, ctx);
    if (item.kind === 'match_flash') {
      return { kind: 'match_flash', post, flash: item.flash };
    }
    return { kind: 'post', post };
  });
}

/** Mock / 旧接口无 feedItems 时的兜底 */
export function fallbackPlazaFeed(
  items: RecruitmentPostCard[],
  viewerProfile?: ViewerSlotProfile | null
): PlazaFeedItem[] {
  return buildPlazaFeedWithFlash(items, viewerProfile).map((entry) =>
    entry.kind === 'flash'
      ? { kind: 'match_flash' as const, post: entry.post, flash: entry.flash }
      : { kind: 'post' as const, post: entry.post }
  );
}

export function resolvePlazaFeed(
  data: { feedItems?: PlazaFeedItem[]; items: RecruitmentPostCard[] } | undefined,
  ctx: PlazaEnrichContext,
  viewerProfile?: ViewerSlotProfile | null
): PlazaFeedItem[] {
  const base =
    data?.feedItems?.length
      ? data.feedItems
      : fallbackPlazaFeed(
          (data?.items ?? []).map((p) => enrichPost(p, ctx)),
          viewerProfile
        );

  return enrichPlazaFeedItems(base, ctx);
}

export type PlazaFeedViewerFilter = {
  /** 广场主列表不展示本人招募，改在「我的招募」管理 */
  excludeOwnPosts?: boolean;
  ownPostIds?: ReadonlySet<string>;
};

/** 广场信息流：过滤 Hard Gate / 推荐熔断帖；可选排除本人帖 */
export function filterPlazaFeedForViewer(
  feed: PlazaFeedItem[],
  options?: PlazaFeedViewerFilter
): PlazaFeedItem[] {
  return feed.filter((item) => {
    if (!isPostVisibleInPlaza(item.post)) return false;
    if (options?.excludeOwnPosts && isOwnRecruitmentPost(item.post, options.ownPostIds)) {
      return false;
    }
    return true;
  });
}
