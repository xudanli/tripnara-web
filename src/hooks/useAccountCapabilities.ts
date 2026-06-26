import { useQuery } from '@tanstack/react-query';
import { accountGovernanceApi } from '@/api/account-governance';
import { useAuth } from '@/hooks/useAuth';
import { userApi } from '@/api/user';

export const ACCOUNT_CAPABILITIES_QUERY_KEY = ['account', 'capabilities'] as const;

export function useAccountCapabilities() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ACCOUNT_CAPABILITIES_QUERY_KEY,
    queryFn: async () => {
      let user = null;
      try {
        user = await userApi.getMe();
      } catch {
        /* mock 可在无 user 时降级 */
      }
      return accountGovernanceApi.getCapabilities(user);
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
