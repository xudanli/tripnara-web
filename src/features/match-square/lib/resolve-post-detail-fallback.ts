import type { QueryClient } from '@tanstack/react-query';
import { matchSquareApi } from '@/api/match-square';
import type { RecruitmentPostCard } from '@/types/match-square';
import type { MyRecruitmentHub } from './my-recruitments';

const MY_RECRUITMENT_HUB_QUERY_KEY = ['match-square', 'my-recruitment-hub'] as const;

function findPostInList(items: RecruitmentPostCard[] | undefined, postId: string) {
  return items?.find((post) => post.id === postId) ?? null;
}

/** 从 React Query 缓存中恢复招募帖（广场列表 / 我的招募 / 详情缓存） */
export function resolvePostDetailFromCache(
  queryClient: QueryClient,
  postId: string
): RecruitmentPostCard | null {
  const direct = queryClient.getQueryData<RecruitmentPostCard>(['match-square', 'post', postId]);
  if (direct?.id) return direct;

  const hub = queryClient.getQueryData<MyRecruitmentHub>(MY_RECRUITMENT_HUB_QUERY_KEY);
  const fromHubPublished = findPostInList(hub?.published, postId);
  if (fromHubPublished) return fromHubPublished;
  const fromHubApplied = hub?.applied.find((entry) => entry.post.id === postId)?.post;
  if (fromHubApplied) return fromHubApplied;

  const myPosts = queryClient.getQueryData<{ items?: RecruitmentPostCard[] }>([
    'match-square',
    'my-posts',
  ]);
  const fromMyPosts = findPostInList(myPosts?.items, postId);
  if (fromMyPosts) return fromMyPosts;

  const postQueries = queryClient.getQueriesData<{ items?: RecruitmentPostCard[] }>({
    queryKey: ['match-square', 'posts'],
  });
  for (const [, data] of postQueries) {
    const found = findPostInList(data?.items, postId);
    if (found) return found;
  }

  return null;
}

/** 公开详情 404 时，尝试从我的招募列表恢复（含 closed 帖） */
export async function resolvePostDetailWithFallback(
  postId: string,
  queryClient?: QueryClient
): Promise<RecruitmentPostCard> {
  try {
    return await matchSquareApi.getPost(postId);
  } catch (error) {
    if (queryClient) {
      const cached = resolvePostDetailFromCache(queryClient, postId);
      if (cached) return cached;
    }

    try {
      const myPosts = await matchSquareApi.listMyPosts();
      const owned = findPostInList(myPosts.items, postId);
      if (owned) return owned;
    } catch {
      /* ignore */
    }

    throw error;
  }
}
