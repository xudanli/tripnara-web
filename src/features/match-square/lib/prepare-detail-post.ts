import type {
  ApplyPreview,
  RecruitmentApplicationCard,
  RecruitmentPostCard,
} from '@/types/match-square';
import type { OdysseyCognitiveScores } from '@/types/odyssey-travel-persona';
import type { VerifiedCredentials } from '@/types/match-square';
import {
  buildApplicationStatusMap,
  mergePostApplicationStatus,
} from './application-status';
import { enrichPostMatchInsights } from './match-enrichment';
import type { MatchTripWindow } from './match-engine';
import { mergeApprovedMembersIntoPost } from './team-puzzle';

/** 详情页专用 — 决策翻译仅认 API `matchInsightDrawer`，不合并 apply-preview 摘要 */
export function prepareDetailPost(
  postRaw: RecruitmentPostCard,
  options: {
    viewerScores: OdysseyCognitiveScores | null;
    viewerCredentials?: VerifiedCredentials | null;
    viewerMbtiType?: string;
    viewerPersonaLabel?: string;
    memberTrip?: MatchTripWindow | null;
    myApplications?: RecruitmentApplicationCard[];
    approvedApplications?: RecruitmentApplicationCard[];
    applyPreview?: ApplyPreview | null;
  }
): RecruitmentPostCard {
  let card = enrichPostMatchInsights(
    postRaw,
    options.viewerScores,
    options.viewerCredentials,
    options.viewerMbtiType,
    options.memberTrip
  );

  const hasApiDrawer = Boolean(postRaw.matchInsightDrawer?.lines?.length);
  const hasApiHighlights = Boolean(
    postRaw.matchHighlights?.length || postRaw.matchWarnings?.length
  );

  if (!hasApiDrawer && !hasApiHighlights) {
    card = { ...card, matchHighlights: undefined, matchWarnings: undefined };
  } else if (!hasApiHighlights) {
    card = {
      ...card,
      matchHighlights: postRaw.matchHighlights,
      matchWarnings: postRaw.matchWarnings,
    };
  }

  const applicationMap = buildApplicationStatusMap(options.myApplications ?? []);
  let result = mergePostApplicationStatus(card, applicationMap);

  const previewStatus = options.applyPreview?.existingApplicationStatus;
  if (previewStatus && !result.viewerApplicationStatus) {
    result = { ...result, viewerApplicationStatus: previewStatus };
  }

  return mergeApprovedMembersIntoPost(result, {
    myApplications: options.myApplications,
    approvedApplications: options.approvedApplications,
    viewerPersonaLabel: options.viewerPersonaLabel,
    viewerMbtiType: options.viewerMbtiType,
    viewerCredentials: options.viewerCredentials,
  });
}
