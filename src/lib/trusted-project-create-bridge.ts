import type { CreateTrustedProjectRequest } from '@/types/trusted-projects';
import {
  buildRecruitmentInitialFromRouteTemplate,
  getCatalogEntryById,
  parseRouteTemplatePlazaSearchParams,
  type RouteTemplatePlazaSearchParams,
} from '@/features/match-square/lib/route-template-plaza-bridge';

export type TrustedProjectCreateInitial = Partial<
  Pick<
    CreateTrustedProjectRequest,
    | 'title'
    | 'destination'
    | 'startDate'
    | 'endDate'
    | 'summary'
    | 'slotsTotal'
    | 'budgetMinCents'
    | 'budgetMaxCents'
    | 'tripId'
  >
> & {
  routeTemplateCatalogId?: string;
  routeTemplateHeadline?: string | null;
};

export function parseTrustedProjectCreateSearchParams(
  params: URLSearchParams | Record<string, string | undefined>
): { tripId?: string; routeTemplate: RouteTemplatePlazaSearchParams } {
  const get = (key: string) =>
    params instanceof URLSearchParams ? params.get(key) ?? undefined : params[key];

  const tripId = get('tripId')?.trim() || undefined;
  const routeTemplate = parseRouteTemplatePlazaSearchParams(params);

  return { tripId, routeTemplate };
}

export function buildTrustedProjectCreateInitialFromRouteTemplate(
  routeTemplate: RouteTemplatePlazaSearchParams
): TrustedProjectCreateInitial | null {
  const catalogId = routeTemplate.routeTemplateCatalogId;
  if (!catalogId) return null;

  const entry = getCatalogEntryById(catalogId);
  if (!entry) return null;

  const recruitment = buildRecruitmentInitialFromRouteTemplate({
    catalogEntry: entry,
    routeDirectionId: routeTemplate.routeDirectionId,
    routeDirectionName: routeTemplate.routeDirectionName,
    routeTemplateId: routeTemplate.routeTemplateId,
    vibeSeed: routeTemplate.vibeSeed,
    autoConfirm: routeTemplate.confirmTemplate,
  });

  return {
    title: entry.titleZh,
    destination: recruitment.destination ?? entry.titleZh,
    startDate: recruitment.startDate,
    endDate: recruitment.endDate,
    summary: recruitment.recruitmentVision ?? recruitment.vibeRawText,
    slotsTotal: recruitment.slotsNeeded ?? 6,
    budgetMinCents: recruitment.budgetRange?.minCents ?? undefined,
    budgetMaxCents: recruitment.budgetRange?.maxCents ?? undefined,
    routeTemplateCatalogId: catalogId,
    routeTemplateHeadline: `🗺️ ${entry.titleZh}`,
  };
}

export function buildTrustedProjectCreateUrl(input: {
  tripId?: string;
  routeTemplateCatalogId?: string;
  routeTemplateId?: number;
  routeDirectionId?: number;
  routeDirectionName?: string;
  confirmTemplate?: boolean;
}): string {
  const q = new URLSearchParams();
  if (input.tripId) q.set('tripId', input.tripId);
  if (input.routeTemplateCatalogId) q.set('routeTemplateCatalogId', input.routeTemplateCatalogId);
  if (input.routeTemplateId != null) q.set('routeTemplateId', String(input.routeTemplateId));
  if (input.routeDirectionId != null) q.set('routeDirectionId', String(input.routeDirectionId));
  if (input.routeDirectionName) q.set('routeDirectionName', input.routeDirectionName);
  if (input.confirmTemplate) q.set('confirmTemplate', '1');
  const query = q.toString();
  return query ? `/dashboard/trusted-projects/new?${query}` : '/dashboard/trusted-projects/new';
}
