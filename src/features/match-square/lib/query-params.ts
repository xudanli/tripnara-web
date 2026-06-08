import type { PostListFilters } from '@/types/match-square';

/** 将筛选器序列化为后端 query（逗号分隔多选） */
export function serializePostListFilters(filters: PostListFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (filters.destination) params.destination = filters.destination;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.personaTypes?.length) params.personaTypes = filters.personaTypes.join(',');
  if (filters.personaQuadrants?.length) {
    params.personaQuadrants = filters.personaQuadrants.join(',');
  }
  if (filters.interactionModes?.length) {
    params.interactionModes = filters.interactionModes.join(',');
  }
  if (filters.planningStyles?.length) {
    params.planningStyles = filters.planningStyles.join(',');
  }
  if (filters.limit != null) params.limit = filters.limit;
  if (filters.offset != null) params.offset = filters.offset;
  return params;
}
