import { useQuery } from '@tanstack/react-query';
import type { VerifiedCredentials } from '@/types/match-square';
import { loadMyCredentials } from '@/features/odyssey-intake/lib/credentials-loader';

export const CREDENTIALS_QUERY_KEY = ['odyssey-intake', 'credentials', 'me'] as const;

/** 当前登录用户 Identity Hub 背书 — 用于圈层匹配与广场自我状态展示 */
export function useMyVerifiedCredentials(enabled = true) {
  return useQuery({
    queryKey: CREDENTIALS_QUERY_KEY,
    queryFn: loadMyCredentials,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function patchMyCredentialsCache(
  credentials: VerifiedCredentials | null
): { queryKey: typeof CREDENTIALS_QUERY_KEY; data: VerifiedCredentials | null } {
  return { queryKey: CREDENTIALS_QUERY_KEY, data: credentials };
}
