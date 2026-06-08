import type { RecruitmentApplicationCard, RecruitmentPostCard } from '@/types/match-square';
import type { PreMatchDecisionBrief } from '@/types/collaborative-task-flywheel';
import { buildPreMatchDecisionBrief } from './pre-match-decision.engine';
import { normalizePreMatchDecisionBrief } from './normalize-collaborative-tasks';

/** API 未返回 decisionBrief 时，客户端纯函数兜底 */
export function enrichApplicationWithDecisionBrief(
  application: RecruitmentApplicationCard,
  post: RecruitmentPostCard
): RecruitmentApplicationCard {
  const fromApi = application.decisionBrief ?? normalizePreMatchDecisionBrief(
    (application as RecruitmentApplicationCard & { decision_brief?: unknown }).decision_brief
  );

  if (fromApi?.narrativeLine) {
    return { ...application, decisionBrief: fromApi };
  }

  if (application.status !== 'pending') {
    return application;
  }

  const brief: PreMatchDecisionBrief = buildPreMatchDecisionBrief({ post, application });
  if (!brief.narrativeLine) return application;

  return { ...application, decisionBrief: brief };
}

export function enrichApplicationsWithDecisionBriefs(
  applications: RecruitmentApplicationCard[],
  post: RecruitmentPostCard
): RecruitmentApplicationCard[] {
  return applications.map((app) => enrichApplicationWithDecisionBrief(app, post));
}
