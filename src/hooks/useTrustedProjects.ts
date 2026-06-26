import { useQuery } from '@tanstack/react-query';
import { trustedProjectsApi } from '@/api/trusted-projects';
import type { TrustedProjectListQuery } from '@/types/trusted-projects';
import { useAuth } from '@/hooks/useAuth';

export const TRUSTED_PROJECTS_LIST_KEY = ['trusted-projects', 'list'] as const;

export function useTrustedProjects(query?: TrustedProjectListQuery) {
  return useQuery({
    queryKey: [...TRUSTED_PROJECTS_LIST_KEY, query] as const,
    queryFn: () => trustedProjectsApi.list(query),
    staleTime: 30_000,
  });
}

export function useTrustedProject(id: string | undefined) {
  return useQuery({
    queryKey: ['trusted-projects', id] as const,
    queryFn: () => trustedProjectsApi.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useMyTrustedProjects() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['trusted-projects', 'mine'] as const,
    queryFn: () => trustedProjectsApi.listMine(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}
