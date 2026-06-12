import { matchSquareApi } from '@/api/match-square';
import { enrichApplicationsWithApplicantIdentity } from './enrich-applications-applicant-identity';
import { resolvePostDetailWithFallback } from './resolve-post-detail-fallback';
import type {
  ApplicationStatus,
  RecruitmentApplicationCard,
  RecruitmentPostCard,
} from '@/types/match-square';
import {
  buildApplicationStatusMap,
  mergePostApplicationStatus,
} from './application-status';
import { mergeApprovedMembersIntoPost } from './team-puzzle';

export type MyAppliedRecruitment = {
  application: RecruitmentApplicationCard;
  post: RecruitmentPostCard;
};

export type MyRecruitmentHub = {
  published: RecruitmentPostCard[];
  applied: MyAppliedRecruitment[];
};

const APPLICATION_STATUS_RANK: Record<ApplicationStatus, number> = {
  approved: 4,
  pending: 3,
  withdrawn: 2,
  rejected: 1,
};

function pickPrimaryApplication(
  applications: RecruitmentApplicationCard[]
): RecruitmentApplicationCard {
  return [...applications].sort((a, b) => {
    const rankDiff = APPLICATION_STATUS_RANK[b.status] - APPLICATION_STATUS_RANK[a.status];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })[0];
}

export function enrichPostWithMyApplication(
  post: RecruitmentPostCard,
  application: RecruitmentApplicationCard
): RecruitmentPostCard {
  let card = mergePostApplicationStatus(post, buildApplicationStatusMap([application]));
  if (application.status === 'approved') {
    card = mergeApprovedMembersIntoPost(card, {
      myApplications: [application],
      approvedApplications: [application],
    });
  }
  return card;
}

function groupApplicationsByPost(
  applications: RecruitmentApplicationCard[],
  ownedPostIds: Set<string>
): Map<string, RecruitmentApplicationCard> {
  const grouped = new Map<string, RecruitmentApplicationCard[]>();
  for (const application of applications) {
    if (ownedPostIds.has(application.postId)) continue;
    const list = grouped.get(application.postId) ?? [];
    list.push(application);
    grouped.set(application.postId, list);
  }

  const primary = new Map<string, RecruitmentApplicationCard>();
  for (const [postId, list] of grouped) {
    primary.set(postId, pickPrimaryApplication(list));
  }
  return primary;
}

export async function loadMyRecruitmentHub(): Promise<MyRecruitmentHub> {
  const [publishedResponse, applicationsRaw] = await Promise.all([
    matchSquareApi.listMyPosts(),
    matchSquareApi.listMyApplications(),
  ]);
  const applications = await enrichApplicationsWithApplicantIdentity(applicationsRaw);

  const publishedRaw = publishedResponse.items ?? [];
  const published = await Promise.all(
    publishedRaw.map(async (post) => {
      try {
        const apps = await enrichApplicationsWithApplicantIdentity(
          await matchSquareApi.listApplications(post.id)
        );
        const approved = apps.filter((app) => app.status === 'approved');
        if (!approved.length) return post;
        return mergeApprovedMembersIntoPost(post, { approvedApplications: approved });
      } catch {
        return post;
      }
    })
  );
  const ownedPostIds = new Set(published.map((post) => post.id));
  const applicationsByPost = groupApplicationsByPost(applications, ownedPostIds);

  const appliedEntries = await Promise.all(
    [...applicationsByPost.entries()].map(async ([postId, application]) => {
      try {
        const post = await resolvePostDetailWithFallback(postId);
        return {
          application,
          post: enrichPostWithMyApplication(post, application),
        } satisfies MyAppliedRecruitment;
      } catch {
        return null;
      }
    })
  );

  const applied = appliedEntries
    .filter((entry): entry is MyAppliedRecruitment => entry != null)
    .sort((a, b) => {
      const rankDiff =
        APPLICATION_STATUS_RANK[b.application.status] -
        APPLICATION_STATUS_RANK[a.application.status];
      if (rankDiff !== 0) return rankDiff;
      return (
        new Date(b.application.createdAt).getTime() -
        new Date(a.application.createdAt).getTime()
      );
    });

  return { published, applied };
}
