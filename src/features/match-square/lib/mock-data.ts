import type {
  PostListFilters,
  RecruitmentApplicationCard,
  RecruitmentPostCard,
} from '@/types/match-square';
import { PLANNING_STYLE_CAPSULES } from './constants';
import { generateRecruitmentCopyFromVision } from './generate-recruitment-copy';
import { MOCK_CAPTAIN_DANNY, MOCK_CAPTAIN_LIN, MOCK_CAPTAIN_SU } from './verified-credentials';
import { buildVibeLlmParseResponse } from './vibe-llm/normalize-api';
import { applyVibeParseToPost } from './vibe-llm/puzzle-from-vibe';
import { vibeLlmFromParse } from './vibe-llm/to-card-view';

const MBTI_QUADRANT_MAP: Record<string, 'NT' | 'NF' | 'SP' | 'SJ'> = {
  INTJ: 'NT',
  INTP: 'NT',
  ENTJ: 'NT',
  ENTP: 'NT',
  INFP: 'NF',
  INFJ: 'NF',
  ENFP: 'NF',
  ENFJ: 'NF',
  ISTP: 'SP',
  ISFP: 'SP',
  ESTP: 'SP',
  ESFP: 'SP',
  ISTJ: 'SJ',
  ISFJ: 'SJ',
  ESTJ: 'SJ',
  ESFJ: 'SJ',
};

function mbtiQuadrant(type: string): 'NT' | 'NF' | 'SP' | 'SJ' {
  return MBTI_QUADRANT_MAP[type] ?? 'NF';
}

export function filterPosts(
  items: RecruitmentPostCard[],
  filters: PostListFilters
): RecruitmentPostCard[] {
  return items.filter((item) => {
    if (item.status !== 'active') return false;

    if (filters.destination?.trim()) {
      const q = filters.destination.trim().toLowerCase();
      const haystack = [
        item.destination,
        item.departureLabel,
        item.itinerarySummary,
        item.recruitmentVision,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.dateFrom && item.endDate < filters.dateFrom) return false;
    if (filters.dateTo && item.startDate > filters.dateTo) return false;

    if (filters.personaQuadrants?.length) {
      const q = mbtiQuadrant(item.captainMbtiType);
      if (!filters.personaQuadrants.includes(q)) return false;
    }

    if (filters.personaTypes?.length) {
      if (!filters.personaTypes.includes(item.captainMbtiType)) return false;
    }

    if (filters.interactionModes?.length) {
      if (!filters.interactionModes.includes(item.captainInteractionMode as never)) return false;
    }

    if (filters.planningStyles?.length) {
      const style = item.planningStyle ?? item.teamworkStyle;
      if (!style || !filters.planningStyles.includes(style)) return false;
    }

    return true;
  });
}

export function formatDateRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getMonth() + 1}月下旬`;
  }
  const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatBudgetFromCents(range: { minCents: number | null; maxCents: number | null } | null): string | null {
  if (!range) return null;
  const min = range.minCents != null ? Math.round(range.minCents / 100) : null;
  const max = range.maxCents != null ? Math.round(range.maxCents / 100) : null;
  if (min != null && max != null) return `¥${min}–${max} / 人`;
  if (min != null) return `¥${min}+ / 人`;
  if (max != null) return `≤ ¥${max} / 人`;
  return null;
}

/** 用 Vibe LLM 规则引擎为种子帖补齐 recruitmentVision / vibeLlm / teamPuzzle */
function seedVibePost(base: RecruitmentPostCard, vision: string): RecruitmentPostCard {
  const slotsNeeded = base.teamStatus?.slotsNeeded ?? 1;
  const parsed = buildVibeLlmParseResponse({
    freeText: vision,
    slotsNeeded,
    captainContext: {
      mbtiType: base.captainMbtiType,
      personaTitle: base.captainCardTitle,
    },
  });
  const copy = generateRecruitmentCopyFromVision(vision, {
    parse: parsed.parse,
    personaTitle: base.captainCardTitle,
    mbtiType: base.captainMbtiType,
    destination: base.destination,
  });
  const style = parsed.suggestedPlanningStyle;
  const withStyle: RecruitmentPostCard = {
    ...base,
    planningStyle: style,
    teamworkStyle: style,
    teamworkStyleCapsule: PLANNING_STYLE_CAPSULES[style],
  };
  const enriched = applyVibeParseToPost(withStyle, parsed.parse, vision, {
    parseSource: parsed.parseSource,
    teamworkContractModelLabel: parsed.teamworkContractModelLabel,
  });
  return {
    ...enriched,
    recruitmentVision: vision.trim(),
    vibeLlm: vibeLlmFromParse(
      parsed.parse,
      parsed.parseSource,
      vision,
      parsed.teamworkContractModelLabel
    ),
    itinerarySummary: copy?.itinerarySummary ?? base.itinerarySummary,
    captainMessage: copy?.captainMessage ?? base.captainMessage ?? null,
  };
}

const VISION_QINGGAN =
  '青甘环线深度人文游，莫高窟不赶场 rush。希望搭子对历史文化有兴趣，能一起策划分工，自驾环湖，不是打卡特种兵。';

const VISION_OFFROAD =
  '想去西藏阿里或者冰岛无人区搞次真自驾越野。一路上可能断网没信号，条件比较艰苦，不搞精致露营，就是硬核野外生存。希望搭子是理工科背景、动手能力极强的硬核老司机。最好遇到爆胎、陷车能一起提着扳手下去干活的，不要温室里的花朵，芝麻分必须极佳。';

const VISION_LAUGAVEGUR =
  '冰岛内陆 Laugavegur 兰格维格 55km 硬核重装 4 日，Landmannalaugar 到 Þórsmörk，全程 DEM 离线高程与卫星链路冗余，Fjórðungakvísl 强涉水点需全队共检。队长 INTJ 全托管节奏，找能跟从安全蓝图、不拖后腿的搭子。';

const BASE_POSTS: RecruitmentPostCard[] = [
  {
    id: 'rec-1',
    status: 'active',
    captainUserId: 'captain-1',
    captainDisplayName: 'Danny',
    verifiedCredentials: MOCK_CAPTAIN_DANNY,
    captainVerifiedCredentials: MOCK_CAPTAIN_DANNY,
    captainCardTitle: '规划型探索者',
    captainMbtiType: 'INTJ',
    captainInteractionMode: 'deep_learning',
    captainInteractionModeLabel: '深度共学型',
    captainReputationStars: 4.9,
    compatibilityPercent: 96,
    destination: '西北 · 青甘环线',
    departureLabel: '杭州出发',
    startDate: '2026-06-20',
    endDate: '2026-07-05',
    teamStatus: { slotsFilled: 2, slotsNeeded: 1, slotsRemaining: 1 },
    captainMessage: '希望搭子对人文历史有兴趣，不赶路，深度看窟',
    itinerarySummary: '兰州进西宁出，敦煌莫高窟深度 2 天，青海湖环湖，避开网红打卡 rush。',
    budgetRange: { minCents: 450000, maxCents: 650000 },
    tripMoodTag: 'relax',
    planningStyle: 'co_planning',
    teamworkStyle: 'co_planning',
    teamworkStyleCapsule: PLANNING_STYLE_CAPSULES.co_planning,
    travelMode: 'self_drive',
    vehicleInfo: '坦克 300 · 剩余 1 座',
    preferences: '希望搭子对人文历史有兴趣，能一起深度看窟',
    publishedAt: '2026-06-01T08:00:00Z',
  },
  {
    id: 'rec-2',
    status: 'active',
    captainUserId: 'captain-2',
    captainDisplayName: '林夏',
    verifiedCredentials: MOCK_CAPTAIN_LIN,
    captainVerifiedCredentials: MOCK_CAPTAIN_LIN,
    captainCardTitle: '随性体验者',
    captainMbtiType: 'ENTP',
    captainInteractionMode: 'easy_companion',
    captainInteractionModeLabel: '轻松陪伴型',
    captainReputationStars: 4.6,
    compatibilityPercent: 78,
    destination: '冰岛 · 南岸',
    departureLabel: '雷克雅未克',
    startDate: '2026-07-12',
    endDate: '2026-07-20',
    teamStatus: { slotsFilled: 1, slotsNeeded: 2, slotsRemaining: 2 },
    captainMessage: '不赶景点，天气好就多停，主打一个随缘探索',
    itinerarySummary: '南岸瀑布 + 黑沙滩 + 冰川徒步，行程弹性大，看天气随时调整。',
    budgetRange: { minCents: 1200000, maxCents: 1800000 },
    tripMoodTag: 'adventure',
    planningStyle: 'casual_play',
    teamworkStyle: 'casual_play',
    teamworkStyleCapsule: PLANNING_STYLE_CAPSULES.casual_play,
    travelMode: 'self_drive',
    vehicleInfo: '四驱 SUV · 剩余 2 座',
    publishedAt: '2026-05-28T10:00:00Z',
  },
  {
    id: 'rec-3',
    status: 'active',
    captainUserId: 'captain-3',
    captainDisplayName: '苏墨',
    verifiedCredentials: MOCK_CAPTAIN_SU,
    captainVerifiedCredentials: MOCK_CAPTAIN_SU,
    captainCardTitle: '落日收集者',
    captainMbtiType: 'ISFP',
    captainInteractionMode: 'independent',
    captainInteractionModeLabel: '各自独立型',
    captainReputationStars: 4.8,
    compatibilityPercent: 85,
    destination: '云南 · 滇西北',
    departureLabel: '丽江',
    startDate: '2026-08-01',
    endDate: '2026-08-10',
    teamStatus: { slotsFilled: 1, slotsNeeded: 1, slotsRemaining: 1 },
    captainMessage: '接受各自独立型相处，白天可分开行动，晚上一起分享见闻',
    itinerarySummary: '梅里雪山日照金山、雨崩轻徒步，节奏松弛，各自拍照互不打扰。',
    budgetRange: { minCents: 300000, maxCents: 500000 },
    tripMoodTag: 'healing',
    planningStyle: 'full_managed',
    teamworkStyle: 'full_managed',
    teamworkStyleCapsule: PLANNING_STYLE_CAPSULES.full_managed,
    travelMode: 'mixed',
    publishedAt: '2026-05-30T14:00:00Z',
  },
  {
    id: 'rec-vibe-offroad',
    status: 'active',
    captainUserId: 'captain-4',
    captainDisplayName: '老K',
    verifiedCredentials: MOCK_CAPTAIN_DANNY,
    captainVerifiedCredentials: MOCK_CAPTAIN_DANNY,
    captainCardTitle: '硬核路书党',
    captainMbtiType: 'ISTP',
    captainInteractionMode: 'independent',
    captainInteractionModeLabel: '各自独立型',
    captainReputationStars: 4.7,
    compatibilityPercent: 68,
    destination: '西藏阿里 · 冰岛无人区',
    departureLabel: '拉萨 / 雷克雅未克',
    startDate: '2026-09-05',
    endDate: '2026-09-20',
    teamStatus: { slotsFilled: 1, slotsNeeded: 2, slotsRemaining: 2 },
    captainMessage: null,
    itinerarySummary: '',
    budgetRange: { minCents: 1500000, maxCents: 2500000 },
    tripMoodTag: 'adventure',
    planningStyle: 'co_planning',
    teamworkStyle: 'co_planning',
    teamworkStyleCapsule: PLANNING_STYLE_CAPSULES.co_planning,
    travelMode: 'self_drive',
    vehicleInfo: '改装越野 · 剩余 2 座',
    publishedAt: '2026-06-04T06:00:00Z',
  },
];

/** 广场种子帖：rec-1 / rec-vibe-offroad 带 Vibe v2；rec-laugavegur 为 §3.13 验收帖 */
export const MOCK_POSTS: RecruitmentPostCard[] = [
  seedVibePost(BASE_POSTS[0], VISION_QINGGAN),
  seedVibePost(
    {
      ...BASE_POSTS[1],
      id: 'rec-laugavegur',
      captainUserId: 'current-user',
      captainDisplayName: 'Danny',
      verifiedCredentials: MOCK_CAPTAIN_DANNY,
      captainVerifiedCredentials: MOCK_CAPTAIN_DANNY,
      captainCardTitle: '指挥官型探索者',
      captainMbtiType: 'INTJ',
      captainInteractionMode: 'deep_learning',
      captainInteractionModeLabel: '深度共学型',
      destination: '冰岛 · 兰格维格',
      departureLabel: 'Landmannalaugar',
      planningStyle: 'full_managed',
      teamworkStyle: 'full_managed',
      teamworkStyleCapsule: PLANNING_STYLE_CAPSULES.full_managed,
      routeTemplateCatalogId: 'is_laugavegur_55km_heavy_4d',
    },
    VISION_LAUGAVEGUR
  ),
  BASE_POSTS[2],
  seedVibePost(BASE_POSTS[3], VISION_OFFROAD),
];

export const MOCK_APPLICATIONS: Record<string, RecruitmentApplicationCard[]> = {
  'rec-1': [
    {
      id: 'app-1',
      postId: 'rec-1',
      status: 'pending',
      applicantUserId: 'user-wxy',
      applicantDisplayName: '王小野',
      applicantCardTitle: '随性体验者',
      applicantMbtiType: 'ISFP',
      applicantInteractionMode: 'easy_companion',
      applicantInteractionModeLabel: '轻松陪伴型',
      applicantReputationStars: 4.9,
      compatibilityPercent: 78,
      highlights: [
        '你们都不喜欢被死板的时间表束缚，行程弹性极高（计划性特质契合）。',
        '消费观念高度匹配，在拼房与就餐预算上处于同一带宽。',
      ],
      warnings: [
        '你对历史文化极度较真，而他偏向「随便看看」的感官松弛感，行中可能产生审美分歧。',
      ],
      message:
        'Danny 你好！我被你的西北路线深度游吸引了，历史文化方面我小白一个，一路上听你讲就好，绝不催促！我可以负责拍照和开车！',
      planningCommitmentAccepted: false,
      teamworkCommitmentAccepted: false,
      createdAt: '2026-06-02T09:00:00Z',
      decidedAt: null,
    },
  ],
  'rec-laugavegur': [
    {
      id: 'app-laugavegur-1',
      postId: 'rec-laugavegur',
      status: 'pending',
      applicantUserId: 'user-anxious-hiker',
      applicantDisplayName: '小岚',
      applicantCardTitle: '轻装疗愈者',
      applicantMbtiType: 'INFP',
      applicantInteractionMode: 'easy_companion',
      applicantInteractionModeLabel: '轻松陪伴型',
      applicantReputationStars: 4.5,
      compatibilityPercent: 72,
      highlights: ['重装经验尚可，愿意承担营地炊事分工。'],
      warnings: ['对内陆断网盲导段存在明显焦虑，需要队长提前交付安全蓝图。'],
      message:
        'Danny 你好，兰格维格一直是心愿清单。我重装走过雨崩，但内陆无信号段会紧张，愿意完全跟从你的节奏和安全安排。',
      planningCommitmentAccepted: true,
      teamworkCommitmentAccepted: true,
      physicalFitnessReport: {
        fitPercent: 82,
        evidenceLabel: '重装进阶 · 高海拔经验',
        lines: ['重装背包日走 18km+', '高海拔营地过夜经验'],
      },
      createdAt: '2026-06-06T11:00:00Z',
      decidedAt: null,
    },
  ],
};

export const CURRENT_USER_ID = 'current-user';

export function isPostCaptain(post: RecruitmentPostCard): boolean {
  const storedId = getStoredUserId();
  if (storedId && post.captainUserId) {
    return post.captainUserId === storedId;
  }
  if (typeof post.isCaptain === 'boolean') {
    return post.isCaptain;
  }
  return post.captainUserId === CURRENT_USER_ID;
}

/** 是否为当前用户发布的招募（广场需排除或打标） */
export function isOwnRecruitmentPost(
  post: RecruitmentPostCard,
  ownPostIds?: ReadonlySet<string>
): boolean {
  if (ownPostIds?.has(post.id)) return true;
  return isPostCaptain(post);
}

function getStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed.id ?? null;
  } catch {
    return null;
  }
}
