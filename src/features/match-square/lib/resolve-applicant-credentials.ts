import type { RecruitmentApplicationCard, VerifiedCredentials } from '@/types/match-square';
import { isPuzzleDeficitPersonaLabel } from './compact-puzzle-slot-label';
import { credentialsDisplayName } from './verified-credentials';

/** 拼图 slot 合成 id，不可用于 GET /users/:id/credentials */
export function isLikelyRealUserId(userId: string | undefined | null): boolean {
  if (!userId?.trim()) return false;
  if (/^slot-/i.test(userId)) return false;
  if (/-member-|-filled-|-open-|-captain-/i.test(userId)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    userId.trim()
  );
}

export function credentialsNeedRemoteFetch(
  credentials?: VerifiedCredentials | null
): boolean {
  if (!credentials) return true;

  const nickname = credentialsDisplayName(credentials);
  if (nickname && !isPuzzleDeficitPersonaLabel(nickname) && credentials.headline?.identityHeadline) {
    const hasEducation =
      (credentials.dossier?.educationTags?.length ?? 0) > 0 ||
      Boolean(credentials.education?.verified);
    const hasProfession =
      (credentials.dossier?.professionTags?.length ?? 0) > 0 ||
      Boolean(credentials.profession?.verified);
    const hasZhima = Boolean(
      credentials.zhimaCredit?.verified || credentials.dossier?.zhimaCreditLine
    );
    if (hasEducation || hasProfession || hasZhima) return false;
  }

  if (!credentials.headline?.identityHeadline) return true;

  const hasEducation =
    (credentials.dossier?.educationTags?.length ?? 0) > 0 ||
    Boolean(credentials.education?.verified);
  const hasProfession =
    (credentials.dossier?.professionTags?.length ?? 0) > 0 ||
    Boolean(credentials.profession?.verified);
  const hasZhima = Boolean(
    credentials.zhimaCredit?.verified || credentials.dossier?.zhimaCreditLine
  );

  return !(hasEducation || hasProfession || hasZhima);
}

function credentialRichness(credentials?: VerifiedCredentials | null): number {
  if (!credentials) return 0;
  let score = credentials.headline?.identityHeadline ? 1 : 0;
  score += (credentials.dossier?.educationTags?.length ?? 0) * 2;
  score += (credentials.dossier?.professionTags?.length ?? 0) * 2;
  if (credentials.education?.verified) score += 2;
  if (credentials.profession?.verified) score += 2;
  if (credentials.zhimaCredit?.verified) score += 1;
  if (credentials.dossier?.zhimaCreditLine) score += 1;
  return score;
}

/** 内嵌快照 vs 远程拉取 — 取信息更完整的一份 */
export function pickRicherApplicantCredentials(
  embedded?: VerifiedCredentials | null,
  fetched?: VerifiedCredentials | null
): VerifiedCredentials | null {
  if (!embedded && !fetched) return null;
  if (!embedded) return fetched ?? null;
  if (!fetched) return embedded;
  return credentialRichness(fetched) >= credentialRichness(embedded) ? fetched : embedded;
}

function headlineFirstName(identityHeadline: string | undefined | null): string | null {
  const name = identityHeadline
    ?.replace(/^队长\s*[·•\u00b7]?\s*/u, '')
    .split(' · ')[0]
    ?.trim();
  if (!name || isPuzzleDeficitPersonaLabel(name)) return null;
  return name;
}

/** 申请人展示名 — 优先 verifiedCredentials 脱敏真实昵称，跳过拼图 AI 缺位文案 */
export function resolveApplicantRealName(
  application: Pick<
    RecruitmentApplicationCard,
    'applicantDisplayName' | 'applicantVerifiedCredentials'
  >,
  credentials?: VerifiedCredentials | null
): string {
  const candidates = [
    credentials ? credentialsDisplayName(credentials) : '',
    credentials ? headlineFirstName(credentials.headline?.identityHeadline) : null,
    application.applicantVerifiedCredentials
      ? credentialsDisplayName(application.applicantVerifiedCredentials)
      : '',
    headlineFirstName(application.applicantVerifiedCredentials?.headline?.identityHeadline),
    application.applicantDisplayName,
  ];

  for (const candidate of candidates) {
    const name = candidate?.trim();
    if (name && !isPuzzleDeficitPersonaLabel(name)) return name;
  }

  return '旅伴';
}

function headlinePersonaTitle(identityHeadline: string | undefined | null): string | null {
  const parts = identityHeadline
    ?.replace(/^队长\s*[·•\u00b7]?\s*/u, '')
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts || parts.length < 2) return null;
  const title = parts[1];
  if (isPuzzleDeficitPersonaLabel(title)) return null;
  return title;
}

/** 人格标题 — 优先 profile.card.title；缺位脏数据时从背书 headline 恢复 */
export function resolveApplicantCardTitle(
  application: Pick<
    RecruitmentApplicationCard,
    | 'applicantCardTitle'
    | 'applicantDisplayName'
    | 'applicantInteractionModeLabel'
    | 'applicantVerifiedCredentials'
  >,
  credentials?: VerifiedCredentials | null,
  apiCardTitle?: string | null
): string {
  const displayName = resolveApplicantRealName(application, credentials);
  const cardTitle = application.applicantCardTitle?.trim();

  if (
    cardTitle &&
    !isPuzzleDeficitPersonaLabel(cardTitle) &&
    cardTitle !== displayName
  ) {
    return cardTitle;
  }

  const candidates = [
    apiCardTitle,
    credentials ? headlinePersonaTitle(credentials.headline?.identityHeadline) : null,
    headlinePersonaTitle(application.applicantVerifiedCredentials?.headline?.identityHeadline),
    !isPuzzleDeficitPersonaLabel(cardTitle) ? cardTitle : null,
  ];

  for (const candidate of candidates) {
    const title = candidate?.trim();
    if (title && !isPuzzleDeficitPersonaLabel(title) && title !== displayName) return title;
  }

  return cardTitle || application.applicantCardTitle;
}

/** 队员背书 — 去掉误带的「队长 ·」前缀（GET credentials 偶发混入队长视角） */
export function sanitizeMemberApplicantCredentials(
  credentials: VerifiedCredentials,
  memberDisplayName?: string | null
): VerifiedCredentials {
  const headline = credentials.headline?.identityHeadline
    ?.replace(/^队长\s*[·•\u00b7]?\s*/u, '')
    .trim();
  const displayName =
    memberDisplayName?.trim() && !isPuzzleDeficitPersonaLabel(memberDisplayName)
      ? memberDisplayName.trim()
      : credentials.dossier?.displayName && !isPuzzleDeficitPersonaLabel(credentials.dossier.displayName)
        ? credentials.dossier.displayName
        : credentials.headline.displayName?.trim() &&
            !isPuzzleDeficitPersonaLabel(credentials.headline.displayName)
          ? credentials.headline.displayName.trim()
          : headline?.split(' · ')[0]?.trim() && !isPuzzleDeficitPersonaLabel(headline.split(' · ')[0])
            ? headline.split(' · ')[0].trim()
            : '旅伴';

  return {
    ...credentials,
    headline: credentials.headline
      ? {
          ...credentials.headline,
          identityHeadline: headline || credentials.headline.identityHeadline,
        }
      : credentials.headline,
    dossier: credentials.dossier
      ? { ...credentials.dossier, displayName }
      : {
          displayName,
          educationTags: [],
          professionTags: [],
        },
  };
}
