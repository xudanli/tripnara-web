import type { LaunchRecruitmentFromTemplateRequest, LaunchRecruitmentFromTemplateResponse } from '@/types/launch-recruitment';
import type { RouteTemplate } from '@/types/places-routes';
import { matchSquareMockStore } from './mock-store';
import {
  buildRecruitmentInitialFromRouteTemplate,
  resolveCatalogEntryFromTemplate,
} from './route-template-plaza-bridge';
import { buildRouteTemplateMatchPlan } from './route-template-intent/route-template-intent.engine';
import { normalizePostCard } from './normalize-api-response';

export async function mockLaunchRecruitmentFromTemplate(
  template: RouteTemplate,
  form: LaunchRecruitmentFromTemplateRequest
): Promise<LaunchRecruitmentFromTemplateResponse> {
  const catalogEntry = resolveCatalogEntryFromTemplate(template);
  if (!catalogEntry) {
    throw new Error('暂未匹配到结伴广场模板 catalog');
  }

  const initial = buildRecruitmentInitialFromRouteTemplate({
    catalogEntry,
    routeTemplateId: template.id,
    routeDirectionId: template.routeDirectionId,
    routeDirectionName: template.routeDirection?.nameCN ?? template.nameCN,
    dayPlans: template.dayPlans,
    destination: template.routeDirection?.nameCN,
    autoConfirm: true,
  });

  const vision = initial.recruitmentVision ?? catalogEntry.titleZh;
  const matchPlan = buildRouteTemplateMatchPlan({
    visionText: vision,
    vibeChips: [],
    trekkingOrchestration: initial.trekkingOrchestration ?? null,
  });

  const post = await matchSquareMockStore.createPost({
    destination: initial.destination ?? catalogEntry.titleZh,
    departureLabel: form.departureLabel ?? initial.departureLabel ?? undefined,
    startDate: form.startDate,
    endDate: form.endDate,
    slotsNeeded: form.slotsNeeded,
    planningStyle: form.planningStyle,
    captainMessage: form.captainMessage ?? `基于模板「${catalogEntry.titleZh}」发起招募`,
    itinerarySummary: initial.itinerarySummary,
    budgetMinCents: form.budgetMinCents ?? initial.budgetRange?.minCents ?? undefined,
    budgetMaxCents: form.budgetMaxCents ?? initial.budgetRange?.maxCents ?? undefined,
    routeTemplateCatalogId: catalogEntry.catalogId,
    routeTemplateId: template.id,
    routeDirectionId: template.routeDirectionId,
    routeDirectionName: template.routeDirection?.nameCN,
    activityProfile: initial.activityProfile ?? undefined,
    trekkingOrchestration: initial.trekkingOrchestration ?? null,
    vibeFreeText: vision,
    parseSource: 'rules',
  });

  const normalized = normalizePostCard({
    ...post,
    routeTemplateBinding: {
      catalogId: catalogEntry.catalogId,
      routeTemplateId: template.id,
      titleZh: catalogEntry.titleZh,
    },
  });

  const recruitmentPostId = normalized.id;
  const matchSquarePath = `/dashboard/tripnara/plaza/${recruitmentPostId}`;

  return {
    recruitmentPostId,
    matchSquarePath,
    post: normalized,
    routeTemplateMatch: matchPlan,
  };
}
