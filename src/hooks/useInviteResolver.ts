import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteResolverApi } from '@/api/invite-resolver';
import { tripMemberInvitesApi } from '@/api/trip-member-invites';

export const INVITE_RESOLVE_QUERY_KEY = (token: string) => ['invite', 'resolve', token] as const;

export function useResolveInvite(token: string | undefined) {
  return useQuery({
    queryKey: INVITE_RESOLVE_QUERY_KEY(token ?? ''),
    queryFn: () => inviteResolverApi.resolve(token!),
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000,
  });
}

export function useTripMemberInviteContext(code: string | undefined) {
  return useQuery({
    queryKey: ['trip-member-invite', 'context', code],
    queryFn: () => tripMemberInvitesApi.getContext(code!),
    enabled: Boolean(code),
    staleTime: 30_000,
  });
}

export function useAcceptTripMemberInvite(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tripMemberInvitesApi.accept(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trip-member-invite', 'context', code] });
    },
  });
}
