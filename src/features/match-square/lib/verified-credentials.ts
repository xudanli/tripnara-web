import type {
  EducationCredential,
  EducationDegreeLevel,
  EducationTierTag,
  IndustryCluster,
  ProfessionCredential,
  VerifiedCredentials,
  VerifiedCredentialsDossier,
  VerifiedCredentialsHeadline,
  ZhimaCreditCredential,
  ZhimaCreditTier,
} from '@/types/match-square';
import { parseTrustAssetSegments } from './parse-trust-asset-line';

const ZHIMA_TIER_LABELS: Record<ZhimaCreditTier, string> = {
  excellent: '极佳',
  good: '优秀',
  fair: '良好',
  poor: '待提升',
};

const DEGREE_LABELS: Record<EducationDegreeLevel, string> = {
  bachelor: '本科',
  master: '硕士',
  doctorate: '博士',
};

const INDUSTRY_LABELS: Record<IndustryCluster, string> = {
  tech_internet: '科技/互联网',
  finance_consulting: '金融/咨询',
  manufacturing: '知名制造',
  education_research: '教育/科研',
  creative_media: '创意/媒体',
  other_white_collar: '白领职场',
};

export const EDUCATION_TIER_DISPLAY: Record<EducationTierTag, string> = {
  '985_211': '985/211',
  qs_top50: 'QS Top 50',
  overseas_returnee: '海归',
  general: '本科及以上',
};

export function zhimaTierFromScore(score: number | null | undefined): ZhimaCreditTier {
  if (score == null || score <= 0) return 'poor';
  if (score >= 750) return 'excellent';
  if (score >= 700) return 'good';
  if (score >= 650) return 'fair';
  return 'poor';
}

export function formatZhimaDisplay(score: number | null, tier?: ZhimaCreditTier): string {
  const resolved = tier ?? zhimaTierFromScore(score);
  if (score == null) return '🛡️ 芝麻信用待验证';
  return `🛡️ 芝麻信用 ${score} (${ZHIMA_TIER_LABELS[resolved]})`;
}

export function formatEducationDisplay(
  degreeLevel: EducationDegreeLevel,
  tierTags: EducationTierTag[] = []
): string {
  const degree = DEGREE_LABELS[degreeLevel];
  const overseas = tierTags.includes('overseas_returnee');
  const tier =
    tierTags.includes('985_211') || tierTags.includes('qs_top50')
      ? tierTags.includes('985_211')
        ? '985/211'
        : 'QS Top 50'
      : null;
  if (overseas) return `🎓 ${degree}(海归)`;
  if (tier) return `🎓 ${degree} · ${tier}`;
  return `🎓 ${degree}`;
}

export function formatProfessionDisplay(roleTitle: string): string {
  const trimmed = roleTitle.trim();
  return trimmed.startsWith('👨') || trimmed.startsWith('👩') || trimmed.startsWith('💼')
    ? trimmed
    : `👨‍💻 ${trimmed}`;
}

function readString(raw: unknown, fallback = ''): string {
  return typeof raw === 'string' ? raw : fallback;
}

function readEducation(raw: unknown): EducationCredential | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const degreeLevel = r.degreeLevel ?? r.degree_level;
  if (degreeLevel !== 'bachelor' && degreeLevel !== 'master' && degreeLevel !== 'doctorate') {
    return null;
  }

  let tierTags = Array.isArray(r.tierTags ?? r.tier_tags)
    ? (r.tierTags ?? r.tier_tags).filter(
        (x): x is EducationTierTag =>
          x === '985_211' ||
          x === 'qs_top50' ||
          x === 'overseas_returnee' ||
          x === 'general'
      )
    : [];

  const singleTier = readString(r.tierTag ?? r.tier_tag);
  if (tierTags.length === 0 && singleTier) {
    tierTags = tierTagStringToTags(singleTier);
  }

  const displayLabel =
    readString(r.displayLabel ?? r.display_label ?? r.displayTag ?? r.display_tag) ||
    formatEducationDisplay(degreeLevel, tierTags);
  return {
    verified: r.verified !== false,
    degreeLevel,
    tierTags,
    displayLabel,
  };
}

function tierTagStringToTags(tierTag: string): EducationTierTag[] {
  if (tierTag === 'overseas' || tierTag === 'overseas_returnee') return ['overseas_returnee'];
  if (tierTag === '985_211') return ['985_211'];
  if (tierTag === 'qs_top50') return ['qs_top50'];
  return ['general'];
}

function industryTagToCluster(industryTag: string): IndustryCluster | null {
  switch (industryTag) {
    case 'tech':
    case 'tech_internet':
      return 'tech_internet';
    case 'finance':
    case 'finance_consulting':
      return 'finance_consulting';
    case 'manufacturing':
      return 'manufacturing';
    case 'creative':
    case 'creative_media':
      return 'creative_media';
    case 'education':
    case 'education_research':
      return 'education_research';
    case 'other':
    case 'other_white_collar':
      return 'other_white_collar';
    default:
      return null;
  }
}

function readProfession(raw: unknown): ProfessionCredential | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const industryClusterRaw = r.industryCluster ?? r.industry_cluster ?? r.industryTag ?? r.industry_tag;
  const cluster =
    typeof industryClusterRaw === 'string' ? industryTagToCluster(industryClusterRaw) : null;
  if (!cluster) return null;

  const displayTags = Array.isArray(r.displayTags ?? r.display_tags)
    ? (r.displayTags ?? r.display_tags).filter((x): x is string => typeof x === 'string')
    : [];
  const roleTitle =
    readString(r.roleTitle ?? r.role_title) ||
    displayTags.join(' / ') ||
    '';
  if (!roleTitle) return null;

  const displayLabel =
    readString(r.displayLabel ?? r.display_label) ||
    formatProfessionDisplay(displayTags[0] ?? roleTitle);
  return {
    verified: r.verified !== false,
    industryCluster: cluster,
    roleTitle,
    displayLabel,
  };
}

function readZhima(raw: unknown): ZhimaCreditCredential | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const score = typeof r.score === 'number' ? r.score : null;
  const tierRaw = r.tier as ZhimaCreditTier | string | undefined;
  const tier =
    tierRaw === 'excellent' ||
    tierRaw === 'good' ||
    tierRaw === 'fair' ||
    tierRaw === 'poor'
      ? tierRaw
      : zhimaTierFromScore(score);
  const displayLabel =
    readString(r.displayLabel ?? r.display_label ?? r.label) || formatZhimaDisplay(score, tier);
  return {
    verified: r.verified !== false,
    score,
    tier,
    displayLabel,
  };
}

function readStringTags(raw: unknown): Array<{ id: string; label: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .map((label, index) => ({ id: `tag-${index}`, label }));
}

function readTagList(raw: unknown): Array<{ id: string; label: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { id: string; label: string } => {
      return Boolean(x && typeof x === 'object' && 'label' in x);
    })
    .map((x) => ({
      id: readString((x as { id?: string }).id, 'tag'),
      label: readString((x as { label?: string }).label),
    }))
    .filter((x) => x.label.length > 0);
}

function readHeadline(raw: unknown): VerifiedCredentialsHeadline | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  let identityHeadline = readString(r.identityHeadline ?? r.identity_headline);
  let trustAssetLine = readString(r.trustAssetLine ?? r.trust_asset_line);

  const sesameLine = readString(r.sesameCreditLine ?? r.sesame_credit_line);
  if (!trustAssetLine && sesameLine) trustAssetLine = sesameLine;

  if (!identityHeadline) {
    const displayName = readString(r.displayName ?? r.display_name);
    const professionTags = readStringTags(r.professionTags ?? r.profession_tags).map((t) => t.label);
    const educationTags = readStringTags(r.educationTags ?? r.education_tags).map((t) => t.label);
    const parts = [
      displayName,
      professionTags.length ? professionTags.join(' · ') : '',
      educationTags.length ? educationTags.join(' · ') : '',
    ].filter(Boolean);
    if (parts.length) identityHeadline = parts.join(' · ');
  }

  if (!identityHeadline && !trustAssetLine) return null;
  const displayName = readString(r.displayName ?? r.display_name) || undefined;
  return { displayName, identityHeadline, trustAssetLine };
}

function readDossier(raw: unknown, fallbackName?: string): VerifiedCredentialsDossier | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const displayName = readString(r.displayName ?? r.display_name, fallbackName ?? '');

  const educationFromDossier = readEducation(r.education);
  const professionFromDossier = readProfession(r.profession);
  const zhimaCredit = readZhima(r.zhimaCredit ?? r.zhima_credit ?? r.sesameCredit ?? r.sesame_credit);

  const educationTags =
    readTagList(r.educationTags ?? r.education_tags) ||
    (educationFromDossier?.displayLabel
      ? [{ id: 'education', label: educationFromDossier.displayLabel.replace(/^🎓\s*/, '') }]
      : buildDefaultEducationTags(educationFromDossier));
  const professionTags =
    readTagList(r.professionTags ?? r.profession_tags) ||
    (Array.isArray((r.profession as Record<string, unknown> | undefined)?.displayTags)
      ? readStringTags((r.profession as Record<string, unknown>).displayTags).map((t, i) => ({
          id: i === 0 ? 'role' : `tag-${i}`,
          label: t.label,
        }))
      : buildDefaultProfessionTags(professionFromDossier));

  const zhimaCreditLine =
    readString(r.zhimaCreditLine ?? r.zhima_credit_line) ||
    zhimaCredit?.displayLabel ||
    null;

  const reputationStars =
    typeof r.reputationStars === 'number'
      ? r.reputationStars
      : typeof r.reputation_stars === 'number'
        ? r.reputation_stars
        : null;

  if (!displayName && educationTags.length === 0 && professionTags.length === 0 && !zhimaCreditLine) {
    return null;
  }

  return {
    displayName: displayName || fallbackName || '旅伴',
    avatarUrl: readString(r.avatarUrl ?? r.avatar_url) || null,
    educationTags,
    professionTags,
    zhimaCreditLine,
    reputationStars,
  };
}

function buildIdentityHeadline(
  displayName: string,
  profession?: ProfessionCredential | null,
  education?: EducationCredential | null
): string {
  return [displayName, profession?.displayLabel, education?.displayLabel].filter(Boolean).join(' · ');
}

function buildTrustAssetLine(
  zhima?: ZhimaCreditCredential | null,
  teamworkCapsule?: string | null
): string {
  const parts = [zhima?.displayLabel, teamworkCapsule].filter(Boolean);
  return parts.join(' · ');
}

export type NormalizeVerifiedCredentialsContext = {
  captainDisplayName?: string | null;
  captainReputationStars?: number | null;
  teamworkStyleCapsule?: string | null;
  planningStyleLabel?: string | null;
};

/** 从 API verifiedCredentials normalize（headline + dossier 优先） */
export function normalizeVerifiedCredentials(
  raw: unknown,
  ctx: NormalizeVerifiedCredentialsContext = {}
): VerifiedCredentials | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const headlineFromApi = readHeadline(r.headline);
  const headlineDisplayName =
    r.headline && typeof r.headline === 'object'
      ? readString((r.headline as Record<string, unknown>).displayName ?? (r.headline as Record<string, unknown>).display_name)
      : '';
  const dossierFromApi = readDossier(
    r.dossier,
    headlineDisplayName || readString(r.displayName ?? r.display_name) || ctx.captainDisplayName || undefined
  );

  const education =
    readEducation(r.education) ??
    (r.dossier && typeof r.dossier === 'object'
      ? readEducation((r.dossier as Record<string, unknown>).education)
      : null);
  const profession =
    readProfession(r.profession) ??
    (r.dossier && typeof r.dossier === 'object'
      ? readProfession((r.dossier as Record<string, unknown>).profession)
      : null);
  const zhimaCredit = readZhima(
    r.zhimaCredit ?? r.zhima_credit ?? r.sesameCredit ?? r.sesame_credit ??
      (r.dossier && typeof r.dossier === 'object'
        ? (r.dossier as Record<string, unknown>).sesameCredit ??
          (r.dossier as Record<string, unknown>).sesame_credit
        : null)
  );

  const displayName =
    dossierFromApi?.displayName ??
    (headlineDisplayName ||
      readString(r.displayName ?? r.display_name) ||
      ctx.captainDisplayName ||
      headlineFromApi?.identityHeadline.split(' · ')[0] ||
      '');

  if (!displayName && !headlineFromApi?.identityHeadline) return null;

  const teamwork =
    ctx.teamworkStyleCapsule ??
    (ctx.planningStyleLabel ? `🛡️ 组队风格：${ctx.planningStyleLabel}` : null);

  const headline: VerifiedCredentialsHeadline = headlineFromApi ?? {
    identityHeadline: buildIdentityHeadline(displayName, profession, education),
    trustAssetLine: buildTrustAssetLine(zhimaCredit, teamwork),
  };

  const dossier: VerifiedCredentialsDossier | null = (() => {
    const base =
      dossierFromApi ??
      (displayName
        ? {
            displayName,
            avatarUrl: readString(r.avatarUrl ?? r.avatar_url) || null,
            educationTags:
              readTagList(r.educationTags ?? r.education_tags) ||
              buildDefaultEducationTags(education),
            professionTags:
              readTagList(r.professionTags ?? r.profession_tags) ||
              buildDefaultProfessionTags(profession),
            zhimaCreditLine: zhimaCredit?.displayLabel ?? null,
            reputationStars: ctx.captainReputationStars ?? null,
          }
        : null);

    if (!base) return null;

    return {
      ...base,
      zhimaCreditLine: base.zhimaCreditLine ?? zhimaCredit?.displayLabel ?? null,
      reputationStars: base.reputationStars ?? ctx.captainReputationStars ?? null,
    };
  })();

  if (!headline.identityHeadline && dossier) {
    headline.identityHeadline = buildIdentityHeadline(
      dossier.displayName,
      profession,
      education
    );
  }
  if (!headline.trustAssetLine) {
    headline.trustAssetLine = buildTrustAssetLine(zhimaCredit, teamwork);
  }

  return {
    headline,
    dossier,
    education,
    profession,
    zhimaCredit,
  };
}

function buildDefaultEducationTags(
  education: EducationCredential | null
): Array<{ id: string; label: string }> {
  if (!education) return [];
  const tags: Array<{ id: string; label: string }> = [
    { id: 'degree', label: DEGREE_LABELS[education.degreeLevel] },
  ];
  for (const tier of education.tierTags) {
    tags.push({ id: tier, label: EDUCATION_TIER_DISPLAY[tier] });
  }
  return tags;
}

function buildDefaultProfessionTags(
  profession: ProfessionCredential | null
): Array<{ id: string; label: string }> {
  if (!profession) return [];
  return [
    { id: profession.industryCluster, label: INDUSTRY_LABELS[profession.industryCluster] },
    { id: 'role', label: profession.roleTitle },
  ];
}

export function resolveCaptainCredentials(post: {
  verifiedCredentials?: VerifiedCredentials | null;
  captainVerifiedCredentials?: VerifiedCredentials | null;
  captainDisplayName?: string | null;
  captainCardTitle?: string;
  teamworkStyleCapsule?: string | null;
  planningStyleLabel?: string | null;
}): VerifiedCredentials | null {
  const vc = post.verifiedCredentials ?? post.captainVerifiedCredentials;
  if (vc?.headline?.identityHeadline) return vc;
  if (post.captainDisplayName) {
    const teamwork =
      post.teamworkStyleCapsule ??
      (post.planningStyleLabel ? `🛡️ 组队风格：${post.planningStyleLabel}` : '');
    return {
      headline: {
        identityHeadline: post.captainDisplayName,
        trustAssetLine: teamwork,
      },
    };
  }
  return null;
}

export function credentialsDisplayName(vc: VerifiedCredentials | null | undefined): string {
  if (!vc) return '';
  return (
    vc.dossier?.displayName ??
    vc.headline.displayName?.trim() ??
    vc.headline.identityHeadline.split(' · ')[0]?.trim() ??
    ''
  );
}

/** 详情 headline — 避免「队长 队长 · …」重复前缀 */
export function formatCaptainIdentityHeadline(identityHeadline: string): {
  showRoleLabel: boolean;
  headline: string;
} {
  const headline = identityHeadline.trim();
  const alreadyPrefixed =
    /^队长\s*[·•\u00b7]?\s*/.test(headline) || headline.startsWith('队长');
  return {
    showRoleLabel: !alreadyPrefixed,
    headline,
  };
}

export type TrustEndorsementView = {
  zhimaDisplayLine: string | null;
  zhimaTierLabel: string | null;
  reputationStars: number | null;
  hasContent: boolean;
};

/** 抽屉「履约背书」— 合并 dossier / zhimaCredit / trustAssetLine / Reputation OS */
export function resolveTrustEndorsement(
  credentials: VerifiedCredentials,
  reputationStarsOverride?: number | null
): TrustEndorsementView {
  const dossier = credentials.dossier;
  const zhimaDisplayLine =
    dossier?.zhimaCreditLine ??
    credentials.zhimaCredit?.displayLabel ??
    parseTrustAssetSegments(credentials.headline?.trustAssetLine ?? '').find((segment) =>
      /芝麻|信用/.test(segment)
    ) ??
    null;

  const tierFromParen = zhimaDisplayLine?.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null;
  const zhimaTierLabel =
    tierFromParen ??
    (credentials.zhimaCredit?.tier ? ZHIMA_TIER_LABELS[credentials.zhimaCredit.tier] : null);

  const reputationStars =
    reputationStarsOverride ?? dossier?.reputationStars ?? null;

  return {
    zhimaDisplayLine,
    zhimaTierLabel,
    reputationStars,
    hasContent: Boolean(zhimaDisplayLine || zhimaTierLabel || reputationStars != null),
  };
}

/** 补全 dossier 中缺失的背书字段（API 片段 + Reputation OS） */
export function enrichVerifiedCredentialsDossier(
  credentials: VerifiedCredentials,
  options?: { reputationStars?: number | null }
): VerifiedCredentials {
  const stars = options?.reputationStars ?? credentials.dossier?.reputationStars ?? null;
  const zhimaCreditLine =
    credentials.dossier?.zhimaCreditLine ??
    credentials.zhimaCredit?.displayLabel ??
    null;

  if (!credentials.dossier && !stars && !zhimaCreditLine) return credentials;

  return {
    ...credentials,
    dossier: {
      displayName:
        (credentials.dossier?.displayName ?? credentialsDisplayName(credentials)) || '旅伴',
      educationTags: credentials.dossier?.educationTags ?? [],
      professionTags: credentials.dossier?.professionTags ?? [],
      avatarUrl: credentials.dossier?.avatarUrl ?? null,
      zhimaCreditLine,
      reputationStars: stars,
    },
  };
}

/** 队长本人帖 — 用最新 credentials/me 覆盖 Card 内嵌快照 */
export function applyViewerCredentialsToOwnPost(
  post: { captainUserId: string; verifiedCredentials?: VerifiedCredentials | null; captainVerifiedCredentials?: VerifiedCredentials | null; isCaptain?: boolean },
  viewerCredentials: VerifiedCredentials | null | undefined,
  isOwnPost: boolean
): typeof post {
  if (!isOwnPost || !viewerCredentials) return post;
  if (!viewerCredentials.education?.verified && !viewerCredentials.profession?.verified) return post;
  return {
    ...post,
    verifiedCredentials: viewerCredentials,
    captainVerifiedCredentials: viewerCredentials,
  };
}

/** 广场列表可见性（后端 recommendationHidden + 客户端芝麻兜底） */
export function isPostVisibleInPlaza(post: {
  recommendationHidden?: boolean;
  verifiedCredentials?: VerifiedCredentials | null;
  captainVerifiedCredentials?: VerifiedCredentials | null;
}): boolean {
  if (post.recommendationHidden === true) return false;
  const vc = post.verifiedCredentials ?? post.captainVerifiedCredentials;
  const score = vc?.zhimaCredit?.score;
  if (vc?.zhimaCredit?.verified && score != null && score < 550) return false;
  return true;
}

/** @deprecated 使用 isPostVisibleInPlaza */
export function passesTrustHardGate(credentials?: VerifiedCredentials | null): boolean {
  const score = credentials?.zhimaCredit?.score;
  if (credentials?.zhimaCredit?.verified && score != null && score < 550) return false;
  return true;
}

const WHITE_COLLAR_CLUSTERS: IndustryCluster[] = [
  'tech_internet',
  'finance_consulting',
  'education_research',
  'creative_media',
  'other_white_collar',
];

function isWhiteCollar(cluster: IndustryCluster): boolean {
  return WHITE_COLLAR_CLUSTERS.includes(cluster);
}

export function computeBackgroundBonus(
  viewer?: VerifiedCredentials | null,
  captain?: VerifiedCredentials | null
): { bonus: number; industryAligned: boolean; educationAligned: boolean } {
  if (!viewer || !captain) {
    return { bonus: 0, industryAligned: false, educationAligned: false };
  }

  let bonus = 0;
  let industryAligned = false;
  let educationAligned = false;

  const vIndustry = viewer.profession?.industryCluster;
  const cIndustry = captain.profession?.industryCluster;
  if (vIndustry && cIndustry) {
    if (vIndustry === cIndustry) {
      bonus += 10;
      industryAligned = true;
    } else if (isWhiteCollar(vIndustry) && isWhiteCollar(cIndustry)) {
      bonus += 10;
      industryAligned = true;
    }
  }

  const vDegree = viewer.education?.degreeLevel;
  const cDegree = captain.education?.degreeLevel;
  if (vDegree && cDegree) {
    if (vDegree === cDegree) {
      bonus += 8;
      educationAligned = true;
    } else if (
      (vDegree === 'master' && cDegree === 'bachelor') ||
      (vDegree === 'bachelor' && cDegree === 'master') ||
      (vDegree === 'doctorate' && (cDegree === 'master' || cDegree === 'bachelor')) ||
      (cDegree === 'doctorate' && (vDegree === 'master' || vDegree === 'bachelor'))
    ) {
      bonus += 8;
      educationAligned = true;
    }
  }

  if (bonus === 0 && (!vIndustry || !cIndustry) && (!vDegree || !cDegree)) {
    bonus = 2;
  } else if (bonus === 0) {
    bonus = 2;
  }

  return { bonus, industryAligned, educationAligned };
}

/** 将 +2~+18 加成映射到 0~17 维度分（供拆解气泡） */
export function backgroundBonusToDimensionScore(bonus: number): number {
  if (bonus <= 0) return 8;
  return Math.min(17, Math.round(8 + (bonus / 18) * 9));
}

export const MOCK_VIEWER_CREDENTIALS: VerifiedCredentials = {
  headline: {
    identityHeadline: '我 · 👨‍💻 全栈工程师 · 🎓 硕士 · 985/211',
    trustAssetLine: '🛡️ 芝麻信用 780 (极佳)',
  },
  dossier: {
    displayName: '我',
    educationTags: [
      { id: 'degree', label: '硕士' },
      { id: '985_211', label: '985/211' },
    ],
    professionTags: [
      { id: 'tech_internet', label: '科技/互联网' },
      { id: 'role', label: '全栈工程师' },
    ],
    zhimaCreditLine: '🛡️ 芝麻信用 780 (极佳)',
  },
  education: {
    verified: true,
    degreeLevel: 'master',
    tierTags: ['985_211'],
    displayLabel: '🎓 硕士 · 985/211',
  },
  profession: {
    verified: true,
    industryCluster: 'tech_internet',
    roleTitle: '全栈工程师',
    displayLabel: '👨‍💻 全栈工程师',
  },
  zhimaCredit: {
    verified: true,
    score: 780,
    tier: 'excellent',
    displayLabel: '🛡️ 芝麻信用 780 (极佳)',
  },
};

/** 审核卡片 mock · 申请人王小野 */
export const MOCK_APPLICANT_WANG: VerifiedCredentials = {
  headline: {
    identityHeadline: '王小野 · 👨‍💻 独立摄影师 · 🎓 本科 · 985/211',
    trustAssetLine: '🛡️ 芝麻信用 720 (优秀)',
  },
  dossier: {
    displayName: '王小野',
    educationTags: [
      { id: 'degree', label: '本科' },
      { id: '985_211', label: '985/211' },
    ],
    professionTags: [
      { id: 'creative_media', label: '创意/媒体' },
      { id: 'role', label: '独立摄影师' },
    ],
    zhimaCreditLine: '🛡️ 芝麻信用 720 (优秀)',
    reputationStars: 4.9,
  },
  education: {
    verified: true,
    degreeLevel: 'bachelor',
    tierTags: ['985_211'],
    displayLabel: '🎓 本科 · 985/211',
  },
  profession: {
    verified: true,
    industryCluster: 'creative_media',
    roleTitle: '独立摄影师',
    displayLabel: '👨‍💻 独立摄影师',
  },
  zhimaCredit: {
    verified: true,
    score: 720,
    tier: 'good',
    displayLabel: '🛡️ 芝麻信用 720 (优秀)',
  },
};

export const MOCK_CAPTAIN_DANNY: VerifiedCredentials = {
  headline: {
    identityHeadline: 'Danny · 👨‍💻 AI产品总监 / Full-Stack · 🎓 硕士(海归)',
    trustAssetLine: '🛡️ 芝麻信用 800 (极佳) · 🛡️ 组队风格：一起策划',
  },
  dossier: {
    displayName: 'Danny',
    educationTags: [
      { id: 'degree', label: '硕士' },
      { id: 'qs_top50', label: 'QS Top 50' },
      { id: 'overseas_returnee', label: '海归' },
    ],
    professionTags: [
      { id: 'tech_internet', label: '科技/互联网' },
      { id: 'role', label: 'AI产品总监 / Full-Stack' },
    ],
    zhimaCreditLine: '🛡️ 芝麻信用 800 (极佳)',
    reputationStars: 4.9,
  },
  education: {
    verified: true,
    degreeLevel: 'master',
    tierTags: ['overseas_returnee', 'qs_top50'],
    displayLabel: '🎓 硕士(海归)',
  },
  profession: {
    verified: true,
    industryCluster: 'tech_internet',
    roleTitle: 'AI产品总监 / Full-Stack',
    displayLabel: '👨‍💻 AI产品总监 / Full-Stack',
  },
  zhimaCredit: {
    verified: true,
    score: 800,
    tier: 'excellent',
    displayLabel: '🛡️ 芝麻信用 800 (极佳)',
  },
};

export const MOCK_CAPTAIN_LIN: VerifiedCredentials = {
  headline: {
    identityHeadline: '林夏 · 📊 金融分析师 · 🎓 本科 · 985/211',
    trustAssetLine: '🛡️ 芝麻信用 720 (优秀) · 🛡️ 组队风格：一起随便玩',
  },
  dossier: {
    displayName: '林夏',
    educationTags: [
      { id: 'degree', label: '本科' },
      { id: '985_211', label: '985/211' },
    ],
    professionTags: [
      { id: 'finance_consulting', label: '金融/咨询' },
      { id: 'role', label: '金融分析师' },
    ],
    zhimaCreditLine: '🛡️ 芝麻信用 720 (优秀)',
    reputationStars: 4.6,
  },
  education: {
    verified: true,
    degreeLevel: 'bachelor',
    tierTags: ['985_211'],
    displayLabel: '🎓 本科 · 985/211',
  },
  profession: {
    verified: true,
    industryCluster: 'finance_consulting',
    roleTitle: '金融分析师',
    displayLabel: '📊 金融分析师',
  },
  zhimaCredit: {
    verified: true,
    score: 720,
    tier: 'good',
    displayLabel: '🛡️ 芝麻信用 720 (优秀)',
  },
};

export const MOCK_CAPTAIN_SU: VerifiedCredentials = {
  headline: {
    identityHeadline: '苏墨 · 💼 品牌策划 · 🎓 硕士',
    trustAssetLine: '🛡️ 芝麻信用 765 (极佳) · 🛡️ 组队风格：全托管',
  },
  dossier: {
    displayName: '苏墨',
    educationTags: [{ id: 'degree', label: '硕士' }],
    professionTags: [
      { id: 'creative_media', label: '创意/媒体' },
      { id: 'role', label: '品牌策划' },
    ],
    zhimaCreditLine: '🛡️ 芝麻信用 765 (极佳)',
    reputationStars: 4.8,
  },
  education: {
    verified: true,
    degreeLevel: 'master',
    tierTags: ['general'],
    displayLabel: '🎓 硕士',
  },
  profession: {
    verified: true,
    industryCluster: 'creative_media',
    roleTitle: '品牌策划',
    displayLabel: '💼 品牌策划',
  },
  zhimaCredit: {
    verified: true,
    score: 765,
    tier: 'excellent',
    displayLabel: '🛡️ 芝麻信用 765 (极佳)',
  },
};
