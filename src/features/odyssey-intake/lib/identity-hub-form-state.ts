import type { OdysseyVerifyEducationRequest, OdysseyVerifyProfessionRequest } from '@/types/odyssey-intake';
import type { EducationTierTag, IndustryCluster, VerifiedCredentials } from '@/types/match-square';

export function tierTagFromCredentials(
  tierTags: EducationTierTag[] | undefined
): OdysseyVerifyEducationRequest['tierTag'] {
  if (!tierTags?.length) return '985_211';
  if (tierTags.includes('overseas_returnee')) return 'overseas';
  if (tierTags.includes('qs_top50')) return 'qs_top50';
  if (tierTags.includes('985_211')) return '985_211';
  return 'general';
}

export function industryTagFromCluster(
  cluster: IndustryCluster | undefined
): OdysseyVerifyProfessionRequest['industryTag'] {
  switch (cluster) {
    case 'tech_internet':
      return 'tech';
    case 'finance_consulting':
      return 'finance';
    case 'manufacturing':
      return 'manufacturing';
    case 'creative_media':
      return 'creative';
    default:
      return 'other';
  }
}

export function roleTagsFromProfession(roleTitle: string | undefined): {
  roleTag: string;
  skillTag: string;
} {
  if (!roleTitle?.trim()) return { roleTag: '', skillTag: '' };
  const parts = roleTitle.split(' / ').map((s) => s.trim()).filter(Boolean);
  return {
    roleTag: parts[0] ?? '',
    skillTag: parts[1] ?? '',
  };
}

/** 从 GET /credentials/me 回填 Identity Hub 表单 */
export function identityHubFormFromCredentials(credentials: VerifiedCredentials | null | undefined) {
  const education = credentials?.education;
  const profession = credentials?.profession;
  const { roleTag, skillTag } = roleTagsFromProfession(profession?.roleTitle);

  return {
    degreeLevel: education?.degreeLevel ?? ('master' as const),
    tierTag: tierTagFromCredentials(education?.tierTags),
    industryTag: industryTagFromCluster(profession?.industryCluster),
    roleTag: roleTag || '全栈工程师',
    skillTag,
    zhimaScore:
      credentials?.zhimaCredit?.score != null ? String(credentials.zhimaCredit.score) : '780',
  };
}
