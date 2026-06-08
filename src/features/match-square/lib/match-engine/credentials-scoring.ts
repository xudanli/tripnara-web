import type {
  EducationDegreeLevel,
  EducationTierTag,
  IndustryCluster,
  VerifiedCredentials,
} from '@/types/match-square';

const DEGREE_E1: Record<EducationDegreeLevel, number> = {
  bachelor: 3,
  master: 5,
  doctorate: 6,
};

const TIER_E2: Record<EducationTierTag, number> = {
  general: 1,
  '985_211': 4,
  qs_top50: 5,
  overseas_returnee: 5,
};

const INDUSTRY_P1: Record<IndustryCluster, number> = {
  tech_internet: 4,
  finance_consulting: 5,
  manufacturing: 3,
  education_research: 3,
  creative_media: 3,
  other_white_collar: 2,
};

/** 从脱敏职级标签推断 P₂ */
export function inferSeniorityP2(roleTitle?: string | null, verified = false): number {
  if (!verified) return 1;
  const t = (roleTitle ?? '').toLowerCase();
  if (/总监|高管|vp|负责人|head|director|cxo|总裁|合伙人/.test(t)) return 5;
  if (/专家|资深|高级|principal|senior|lead|架构|总监/.test(t)) return 3;
  return 1;
}

export function scoreEducationE1(degree?: EducationDegreeLevel | null, verified = false): number {
  if (!verified || !degree) return 1;
  return DEGREE_E1[degree] ?? 1;
}

export function scoreEducationE2(tierTags?: EducationTierTag[] | null, verified = false): number {
  if (!verified || !tierTags?.length) return 1;
  return Math.max(...tierTags.map((t) => TIER_E2[t] ?? 1));
}

export function scoreIndustryP1(cluster?: IndustryCluster | null, verified = false): number {
  if (!verified || !cluster) return 1;
  return INDUSTRY_P1[cluster] ?? 1;
}

export function computeSocialScore(e1: number, e2: number, p2: number): number {
  return e1 * e2 * p2;
}

/** 将 socialScore 归一化到 1–6 圈层档位，供 Hard Gate 比较 */
export function socialScoreToTier(socialScore: number): number {
  if (socialScore >= 80) return 6;
  if (socialScore >= 45) return 5;
  if (socialScore >= 24) return 4;
  if (socialScore >= 12) return 3;
  if (socialScore >= 4) return 2;
  return 1;
}

export function extractCredentialScalars(credentials?: VerifiedCredentials | null): {
  e1: number;
  e2: number;
  p1: number;
  p2: number;
  socialScore: number;
  socialTier: number;
} {
  const edu = credentials?.education;
  const pro = credentials?.profession;
  const eduVerified = edu?.verified === true;
  const proVerified = pro?.verified === true;

  const e1 = scoreEducationE1(edu?.degreeLevel, eduVerified);
  const e2 = scoreEducationE2(edu?.tierTags, eduVerified);
  const p1 = scoreIndustryP1(pro?.industryCluster, proVerified);
  const p2 = inferSeniorityP2(pro?.roleTitle, proVerified);
  const socialScore = computeSocialScore(e1, e2, p2);

  return { e1, e2, p1, p2, socialScore, socialTier: socialScoreToTier(socialScore) };
}
