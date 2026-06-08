import { matchSquareApi } from '@/api/match-square';
import type { RecruitmentApplicationCard } from '@/types/match-square';
import { isPuzzleDeficitPersonaLabel } from './compact-puzzle-slot-label';
import {
  credentialsNeedRemoteFetch,
  isLikelyRealUserId,
  pickRicherApplicantCredentials,
  resolveApplicantCardTitle,
  resolveApplicantRealName,
  sanitizeMemberApplicantCredentials,
} from './resolve-applicant-credentials';
import { credentialsDisplayName } from './verified-credentials';

function applicationHasBackendIdentity(app: RecruitmentApplicationCard): boolean {
  const name = resolveApplicantRealName(app, app.applicantVerifiedCredentials);
  const title = resolveApplicantCardTitle(app, app.applicantVerifiedCredentials);
  return (
    Boolean(app.applicantVerifiedCredentials?.headline?.identityHeadline) &&
    !isPuzzleDeficitPersonaLabel(name) &&
    !isPuzzleDeficitPersonaLabel(title)
  );
}

function applicationNeedsIdentityEnrich(app: RecruitmentApplicationCard): boolean {
  if (!isLikelyRealUserId(app.applicantUserId)) return false;
  if (applicationHasBackendIdentity(app)) {
    return (
      isPuzzleDeficitPersonaLabel(app.applicantDisplayName) ||
      isPuzzleDeficitPersonaLabel(app.applicantCardTitle)
    );
  }

  return (
    isPuzzleDeficitPersonaLabel(app.applicantDisplayName) ||
    isPuzzleDeficitPersonaLabel(app.applicantCardTitle) ||
    credentialsNeedRemoteFetch(app.applicantVerifiedCredentials)
  );
}

async function fetchApplicantCredentials(
  app: RecruitmentApplicationCard
): Promise<{ credentials: NonNullable<ReturnType<typeof pickRicherApplicantCredentials>>; cardTitle?: string } | null> {
  try {
    const bundle = await matchSquareApi.getUserCredentialsBundle(app.applicantUserId, {
      postId: app.postId,
      mbtiType: app.applicantMbtiType,
    });
    if (!bundle?.credentials) return null;
    return { credentials: bundle.credentials, cardTitle: bundle.cardTitle };
  } catch {
    return null;
  }
}

/** 后端 applications 缺 applicantVerifiedCredentials / 误填缺位文案 — 拉取 GET /users/:id/credentials 补全 */
export async function enrichApplicationWithApplicantIdentity(
  app: RecruitmentApplicationCard
): Promise<RecruitmentApplicationCard> {
  if (!applicationNeedsIdentityEnrich(app)) {
    return {
      ...app,
      applicantDisplayName: resolveApplicantRealName(app, app.applicantVerifiedCredentials),
      applicantCardTitle: resolveApplicantCardTitle(app, app.applicantVerifiedCredentials),
    };
  }

  const fetchedBundle = await fetchApplicantCredentials(app);
  const merged = pickRicherApplicantCredentials(
    app.applicantVerifiedCredentials,
    fetchedBundle?.credentials ?? null
  );

  if (!merged) {
    return {
      ...app,
      applicantDisplayName: resolveApplicantRealName(app, null),
      applicantCardTitle: resolveApplicantCardTitle(app, null),
    };
  }

  const displayName = resolveApplicantRealName(app, merged);
  const credentials = sanitizeMemberApplicantCredentials(merged, displayName);
  const cardTitle = resolveApplicantCardTitle(app, credentials, fetchedBundle?.cardTitle);

  return {
    ...app,
    applicantVerifiedCredentials: credentials,
    applicantDisplayName: displayName || credentialsDisplayName(credentials) || '旅伴',
    applicantCardTitle: cardTitle,
  };
}

export async function enrichApplicationsWithApplicantIdentity(
  apps: RecruitmentApplicationCard[]
): Promise<RecruitmentApplicationCard[]> {
  if (!apps.length) return apps;
  return Promise.all(apps.map(enrichApplicationWithApplicantIdentity));
}
