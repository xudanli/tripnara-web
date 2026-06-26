import type { PlanningStyle, RecruitmentPostCard } from '@/types/match-square';
import type { RouteTemplateIntentMatchPlan } from '@/types/route-template-intent';

/** POST /api/route-directions/templates/:id/launch-recruitment */
export type LaunchRecruitmentFromTemplateRequest = {
  startDate: string;
  endDate: string;
  slotsNeeded: number;
  planningStyle: PlanningStyle;
  departureLabel?: string;
  budgetMinCents?: number;
  budgetMaxCents?: number;
  captainMessage?: string;
  routeTemplateCatalogId?: string;
  routeTemplateTitleZh?: string;
};

export type LaunchRecruitmentFromTemplateResponse = {
  recruitmentPostId: string;
  matchSquarePath: string;
  post: RecruitmentPostCard;
  routeTemplateMatch?: RouteTemplateIntentMatchPlan | null;
};

/** GET /match-square/posts/:id · 模板强绑 */
export type RouteTemplateBinding = {
  catalogId: string;
  routeTemplateId: number;
  titleZh: string;
};
