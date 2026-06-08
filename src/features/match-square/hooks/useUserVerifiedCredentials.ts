import { useQuery } from '@tanstack/react-query';
import { matchSquareApi } from '@/api/match-square';
import type { VerifiedCredentials } from '@/types/match-square';
import {
  credentialsNeedRemoteFetch,
  isLikelyRealUserId,
} from '../lib/resolve-applicant-credentials';

export const userCredentialsQueryKey = (
  userId: string | undefined,
  postId?: string
) => ['match-square', 'user-credentials', userId, postId] as const;

/** §14 · GET /users/:userId/credentials — 审批页 / 雷达等非 Card 场景 */
export function useUserVerifiedCredentials(
  userId: string | undefined,
  options?: {
    postId?: string;
    enabled?: boolean;
    cardTitle?: string;
    mbtiType?: string;
    /** 申请卡片已内嵌时可跳过请求 */
    initialData?: VerifiedCredentials | null;
  }
) {
  const embedded = options?.initialData;
  const shouldFetch =
    Boolean(userId) &&
    isLikelyRealUserId(userId) &&
    credentialsNeedRemoteFetch(embedded);

  return useQuery({
    queryKey: userCredentialsQueryKey(userId, options?.postId),
    queryFn: () =>
      matchSquareApi.getUserCredentials(userId!, {
        postId: options?.postId,
        cardTitle: options?.cardTitle,
        mbtiType: options?.mbtiType,
      }),
    enabled: (options?.enabled ?? true) && shouldFetch,
    staleTime: 60_000,
    initialData:
      embedded?.headline?.identityHeadline && !credentialsNeedRemoteFetch(embedded)
        ? embedded
        : undefined,
  });
}
