import type {
  OdysseyVerifyEducationRequest,
  OdysseyVerifyProfessionRequest,
} from '@/types/odyssey-intake';
import type { EducationTierTag, IndustryCluster, VerifiedCredentials } from '@/types/match-square';
import {
  MOCK_VIEWER_CREDENTIALS,
  formatZhimaDisplay,
  zhimaTierFromScore,
} from '@/features/match-square/lib/verified-credentials';
import {
  blurProfessionVerifiedLabel,
  formatEducationVerifiedLabel,
  inferIndustryFromEmailDomain,
} from '@/features/match-square/lib/privacy-labels';

const STORAGE_KEY = 'odyssey-credentials-me';

const INDUSTRY_MAP: Record<
  NonNullable<OdysseyVerifyProfessionRequest['industryTag']>,
  { cluster: IndustryCluster; label: string }
> = {
  tech: { cluster: 'tech_internet', label: '科技/互联网' },
  finance: { cluster: 'finance_consulting', label: '金融/咨询' },
  manufacturing: { cluster: 'manufacturing', label: '知名制造' },
  creative: { cluster: 'creative_media', label: '创意/媒体' },
  other: { cluster: 'other_white_collar', label: '白领职场' },
};

function tierTagFromApi(tag?: OdysseyVerifyEducationRequest['tierTag']): EducationTierTag[] {
  if (tag === 'overseas') return ['overseas_returnee'];
  if (tag === '985_211') return ['985_211'];
  if (tag === 'qs_top50') return ['qs_top50'];
  return ['general'];
}

function readStored(): VerifiedCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as VerifiedCredentials;
  } catch {
    /* ignore */
  }
  return structuredClone(MOCK_VIEWER_CREDENTIALS);
}

function mergeHeadline(prev: VerifiedCredentials, displayName: string): VerifiedCredentials['headline'] {
  const edu = prev.education?.displayLabel;
  const pro = prev.profession?.displayLabel;
  const zhima = prev.zhimaCredit?.displayLabel;
  return {
    identityHeadline: [displayName, pro, edu].filter(Boolean).join(' · '),
    trustAssetLine: zhima ?? prev.headline.trustAssetLine,
  };
}

export const odysseyCredentialsMockStore = {
  get: (): Promise<VerifiedCredentials | null> => Promise.resolve(readStored()),

  save: (credentials: VerifiedCredentials): Promise<VerifiedCredentials> => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    return Promise.resolve(credentials);
  },

  verifyEducation: (body: OdysseyVerifyEducationRequest): Promise<VerifiedCredentials> => {
    const prev = readStored();
    const displayName = prev.dossier?.displayName ?? '我';
    const tierTags = tierTagFromApi(body.tierTag);
    const degreeLevel = body.degreeLevel ?? 'master';
    const education = {
      verified: true,
      degreeLevel,
      tierTags,
      displayLabel: formatEducationVerifiedLabel(degreeLevel, tierTags),
    };
    const next: VerifiedCredentials = {
      ...prev,
      education,
      headline: mergeHeadline({ ...prev, education }, displayName),
      dossier: {
        displayName,
        avatarUrl: prev.dossier?.avatarUrl ?? null,
        educationTags: [
          {
            id: 'degree',
            label: degreeLevel === 'bachelor' ? '本科(已认证)' : degreeLevel === 'master' ? '硕士(已认证)' : '博士(已认证)',
          },
          ...tierTags.map((t) => ({
            id: t,
            label:
              t === '985_211'
                ? '985/211(已认证)'
                : t === 'qs_top50'
                  ? 'QS Top 50(已认证)'
                  : t === 'overseas_returnee'
                    ? '海归(已认证)'
                    : '本科及以上(已认证)',
          })),
        ],
        professionTags: prev.dossier?.professionTags ?? [],
        zhimaCreditLine: prev.dossier?.zhimaCreditLine ?? prev.zhimaCredit?.displayLabel ?? null,
        reputationStars: prev.dossier?.reputationStars ?? null,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return Promise.resolve(next);
  },

  verifyProfession: (body: OdysseyVerifyProfessionRequest): Promise<VerifiedCredentials> => {
    const prev = readStored();
    const displayName = prev.dossier?.displayName ?? '我';

    let cluster: IndustryCluster;
    let industryLabel: string;
    let roleHint: string;

    if (body.channel === 'work_email' && body.workEmail) {
      cluster = inferIndustryFromEmailDomain(body.workEmail);
      industryLabel =
        cluster === 'tech_internet'
          ? '泛科技'
          : cluster === 'manufacturing'
            ? '知名制造集团'
            : cluster === 'finance_consulting'
              ? '金融咨询'
              : '白领职场';
      const localPart = body.workEmail.split('@')[0] ?? '';
      roleHint = body.roleDisplayTag || localPart.replace(/[._]/g, ' ');
    } else {
      const mapped = INDUSTRY_MAP[body.industryTag ?? 'other'];
      cluster = mapped.cluster;
      industryLabel = mapped.label;
      roleHint = body.roleDisplayTag ?? '';
    }

    const displayLabel = blurProfessionVerifiedLabel(cluster, roleHint);
    const roleTitle = roleHint;
    const profession = {
      verified: true,
      industryCluster: cluster,
      roleTitle,
      displayLabel,
    };
    const next: VerifiedCredentials = {
      ...prev,
      profession,
      headline: mergeHeadline({ ...prev, profession }, displayName),
      dossier: {
        displayName,
        avatarUrl: prev.dossier?.avatarUrl ?? null,
        educationTags: prev.dossier?.educationTags ?? [],
        professionTags: [
          { id: cluster, label: industryLabel },
          { id: 'role', label: displayLabel.replace(/\(已认证\)$/, '') },
        ],
        zhimaCreditLine: prev.dossier?.zhimaCreditLine ?? prev.zhimaCredit?.displayLabel ?? null,
        reputationStars: prev.dossier?.reputationStars ?? null,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return Promise.resolve(next);
  },

  verifyZhima: (creditScore: number): Promise<VerifiedCredentials> => {
    const prev = readStored();
    const displayName = prev.dossier?.displayName ?? '我';
    const tier = zhimaTierFromScore(creditScore);
    const zhimaCredit = {
      verified: true,
      score: creditScore,
      tier,
      displayLabel: formatZhimaDisplay(creditScore, tier),
    };
    const next: VerifiedCredentials = {
      ...prev,
      zhimaCredit,
      headline: {
        ...mergeHeadline(prev, displayName),
        trustAssetLine: zhimaCredit.displayLabel,
      },
      dossier: prev.dossier
        ? { ...prev.dossier, zhimaCreditLine: zhimaCredit.displayLabel }
        : prev.dossier,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return Promise.resolve(next);
  },

  uploadBadge: (_file: File): Promise<{ imageToken: string }> =>
    Promise.resolve({ imageToken: `badge-${Date.now()}` }),

  verifyBadge: (_imageToken: string): Promise<VerifiedCredentials> =>
    odysseyCredentialsMockStore.verifyProfession({
      channel: 'badge_ocr',
      industryTag: 'manufacturing',
      roleDisplayTag: '解决方案专家',
    }),

  verifyOAuth: (
    provider: 'maimai' | 'linkedin',
    _authToken: string
  ): Promise<VerifiedCredentials> =>
    odysseyCredentialsMockStore.verifyProfession({
      channel: provider === 'maimai' ? 'oauth_maimai' : 'oauth_linkedin',
      industryTag: 'tech',
      roleDisplayTag: '产品总监',
    }),
};
