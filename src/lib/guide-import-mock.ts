/**
 * Guide-to-Plan 客户端降级解析（后端未就绪时）
 * MVP 1：基于关键词与常见冰岛 POI 做演示级结构化，非生产解析器。
 */

import type {
  ExtractedPlace,
  ExtractedRoute,
  ExtractedTip,
  GuideBundleSummary,
  GuideClaim,
  GuideRiskHint,
  GuideSource,
  ImportedGuide,
  PlanAdjustmentRow,
  PlanCandidate,
  GuideTripContext,
} from '@/types/guide-import';

const ICELAND_POIS: Array<{ name: string; category: ExtractedPlace['category']; en?: string }> = [
  { name: '塞里雅兰瀑布', category: 'attraction', en: 'Seljalandsfoss' },
  { name: '斯科加瀑布', category: 'attraction', en: 'Skógafoss' },
  { name: '黑沙滩', category: 'attraction', en: 'Reynisfjara' },
  { name: '维克', category: 'area', en: 'Vík' },
  { name: '冰河湖', category: 'attraction', en: 'Jökulsárlón' },
  { name: '钻石沙滩', category: 'attraction', en: 'Diamond Beach' },
  { name: '黄金圈', category: 'area' },
  { name: '辛格维利尔', category: 'attraction', en: 'Þingvellir' },
  { name: '盖歇尔间歇泉', category: 'attraction', en: 'Geysir' },
  { name: '蓝湖', category: 'attraction', en: 'Blue Lagoon' },
  { name: '雷克雅未克', category: 'area', en: 'Reykjavík' },
  { name: '杰古沙龙', category: 'area', en: 'Höfn area' },
];

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractTitle(text: string, source: GuideSource): string {
  if (source.title) return source.title;
  const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 60) return firstLine;
  if (source.type === 'inspiration' && source.inspirationText) {
    return source.inspirationText.slice(0, 40);
  }
  if (source.type === 'link' && source.url) {
    try {
      const host = new URL(source.url).hostname;
      return `来自 ${host} 的攻略`;
    } catch {
      return '链接攻略';
    }
  }
  return '未命名攻略';
}

function findPlacesInText(text: string, guideId: string): ExtractedPlace[] {
  const found: ExtractedPlace[] = [];
  const lower = text.toLowerCase();

  for (const poi of ICELAND_POIS) {
    if (text.includes(poi.name) || (poi.en && lower.includes(poi.en.toLowerCase()))) {
      found.push({
        id: uid('place'),
        name: poi.name,
        nameEN: poi.en,
        category: poi.category,
        sourceGuideIds: [guideId],
        matchConfidence: 'NONE',
        confidence: 'L1',
      });
    }
  }

  // 餐厅 / 住宿粗提取
  const restaurantMatch = text.match(/(?:餐厅|必吃|美食)[：:]\s*([^\n。]+)/g);
  restaurantMatch?.forEach((m) => {
    const name = m.replace(/^[^：:]+[：:]\s*/, '').trim();
    if (name.length > 1 && name.length < 40) {
      found.push({
        id: uid('place'),
        name,
        category: 'restaurant',
        sourceGuideIds: [guideId],
        matchConfidence: 'NONE',
        confidence: 'L1',
      });
    }
  });

  return found;
}

function extractClaims(text: string, guideId: string): GuideClaim[] {
  const claims: GuideClaim[] = [];
  const patterns: Array<{ re: RegExp; type: GuideClaim['claimType']; statement: (m: RegExpMatchArray) => string }> = [
    {
      re: /停留[^。\n]{0,8}(\d+)[^。\n]{0,4}(小时|h)/i,
      type: 'stay_duration',
      statement: (m) => `建议停留约 ${m[1]} 小时`,
    },
    {
      re: /(不建议|不要|避免).{0,20}(冬季|冬天|夜间|自驾)/,
      type: 'avoid_condition',
      statement: (m) => m[0],
    },
    {
      re: /(需要|务必|提前).{0,12}(预约|预订|排队)/,
      type: 'booking_required',
      statement: (m) => m[0],
    },
    {
      re: /(下午|傍晚|日落|逆光).{0,20}(拍照|拍摄|光线)/,
      type: 'photo_tip',
      statement: (m) => m[0],
    },
    {
      re: /(自驾|包车|跟团|公交|巴士)/,
      type: 'transport_mode',
      statement: (m) => `交通方式提及：${m[1]}`,
    },
  ];

  for (const { re, type, statement } of patterns) {
    const m = text.match(re);
    if (m) {
      claims.push({
        id: uid('claim'),
        claimType: type,
        statement: statement(m),
        sourceGuideId: guideId,
        confidence: 'L1',
        verificationStatus: 'UNVERIFIED',
      });
    }
  }
  return claims;
}

function extractTips(text: string, guideId: string): ExtractedTip[] {
  const tips: ExtractedTip[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/避坑|注意|提醒|建议|tips/i.test(line) && line.length < 120) {
      tips.push({
        id: uid('tip'),
        text: line.replace(/^[-*•]\s*/, ''),
        sourceGuideId: guideId,
        confidence: 'L1',
        category: /避坑|注意/.test(line) ? 'pitfall' : 'experience',
      });
    }
  }
  return tips.slice(0, 8);
}

function extractRiskHints(text: string, guideId: string): GuideRiskHint[] {
  const hints: GuideRiskHint[] = [];
  if (/驾驶|开车|路程|公里/.test(text) && /\d+\s*(小时|h|公里|km)/i.test(text)) {
    hints.push({
      id: uid('risk'),
      title: '单日驾驶时长可能过长',
      description: '攻略中提及较长驾驶或移动距离，需结合季节与路况验证是否可执行。',
      severity: 'warning',
      needsVerification: true,
      sourceGuideIds: [guideId],
    });
  }
  if (/冬季|冬天|积雪|封路/.test(text)) {
    hints.push({
      id: uid('risk'),
      title: '季节适用性待确认',
      description: '攻略可能针对特定季节撰写，冬季路况与日照与原文假设可能不同。',
      severity: 'warning',
      needsVerification: true,
      sourceGuideIds: [guideId],
    });
  }
  if (/黑沙滩|海浪/.test(text)) {
    hints.push({
      id: uid('risk'),
      title: '黑沙滩安全提醒',
      description: '海浪风险需单独核验；攻略中的打卡时长未必包含安全缓冲。',
      severity: 'critical',
      needsVerification: true,
      sourceGuideIds: [guideId],
    });
  }
  return hints;
}

function extractRoutes(places: ExtractedPlace[], guideId: string): ExtractedRoute[] {
  const attractionNames = places
    .filter((p) => p.category === 'attraction' || p.category === 'area')
    .map((p) => p.name);
  if (attractionNames.length < 2) return [];
  return [
    {
      id: uid('route'),
      label: '攻略提及路线',
      placeNames: attractionNames,
      sourceGuideId: guideId,
      transportMode: '自驾',
    },
  ];
}

export function mockParseGuide(source: GuideSource): ImportedGuide {
  const guideId = source.id || uid('guide');
  const text =
    source.rawText?.trim() ||
    source.inspirationText?.trim() ||
    (source.url ? `链接攻略：${source.url}\n（链接正文需后端抓取，当前为演示解析）` : '');

  const places = findPlacesInText(text, guideId);
  const claims = extractClaims(text, guideId);
  const tips = extractTips(text, guideId);
  const riskHints = extractRiskHints(text, guideId);
  const routes = extractRoutes(places, guideId);

  return {
    id: guideId,
    source: { ...source, id: guideId, title: extractTitle(text, source) },
    extractedPlaces: places,
    extractedClaims: claims,
    extractedRoutes: routes,
    extractedTips: tips,
    riskHints,
    sourceConfidence: 'L1',
    importedAt: new Date().toISOString(),
    parseStatus: 'parsed',
  };
}

export function mockMergeGuides(guides: ImportedGuide[]): GuideBundleSummary {
  const placeMap = new Map<string, ExtractedPlace>();
  const tips: ExtractedTip[] = [];
  const claims: GuideClaim[] = [];
  const routes: ExtractedRoute[] = [];
  const riskHints: GuideRiskHint[] = [];
  const guideIds = guides.map((g) => g.id);

  for (const g of guides) {
    for (const p of g.extractedPlaces) {
      const key = p.name;
      const existing = placeMap.get(key);
      if (existing) {
        existing.sourceGuideIds = [...new Set([...existing.sourceGuideIds, ...p.sourceGuideIds])];
        if (existing.confidence === 'L1') existing.confidence = 'L2';
      } else {
        placeMap.set(key, { ...p, sourceGuideIds: [...p.sourceGuideIds] });
      }
    }
    tips.push(...g.extractedTips);
    claims.push(...g.extractedClaims);
    routes.push(...g.extractedRoutes);
    riskHints.push(...g.riskHints);
  }

  const allPlaces = [...placeMap.values()];
  const restaurants = allPlaces.filter((p) => p.category === 'restaurant');
  const accommodations = allPlaces.filter((p) => p.category === 'hotel' || p.category === 'area');
  const places = allPlaces.filter((p) => p.category === 'attraction' || p.category === 'area');

  const themeParts: string[] = [];
  if (places.some((p) => /瀑布|黑沙滩|冰河/.test(p.name))) themeParts.push('南岸自然景观');
  if (places.some((p) => /冰河/.test(p.name))) themeParts.push('冰河体验');
  if (claims.some((c) => c.claimType === 'photo_tip')) themeParts.push('偏摄影');
  if (routes.some((r) => r.transportMode === '自驾')) themeParts.push('自驾');

  const themeSummary =
    themeParts.length > 0
      ? themeParts.join(' + ')
      : '综合多篇攻略整理的旅行灵感，待结合你的出行条件进一步调整';

  const unmatchedPlaceNames = allPlaces
    .filter((p) => p.matchConfidence === 'NONE' || !p.matchedPlaceId)
    .map((p) => p.name);

  return {
    guideIds,
    themeSummary,
    destinationHint: /冰岛|iceland/i.test(guides.map((g) => g.source.rawText ?? '').join(' '))
      ? '冰岛'
      : undefined,
    suggestedDays: routes.length > 0 ? Math.min(7, Math.max(3, places.length)) : undefined,
    places,
    restaurants,
    accommodations,
    tips,
    claims,
    routes,
    riskHints,
    unmatchedPlaceNames,
    stats: {
      placeCount: places.length,
      restaurantCount: restaurants.length,
      accommodationCount: accommodations.length,
      tipCount: tips.length,
      riskCount: riskHints.length,
    },
  };
}

export function mockGenerateDraft(
  summary: GuideBundleSummary,
  tripContext: GuideTripContext,
  guideIds: string[],
): PlanCandidate {
  const adjustments: PlanAdjustmentRow[] = [];

  if (tripContext.travelerProfile === 'family_with_elderly') {
    adjustments.push({
      id: uid('adj'),
      category: '每日活动',
      originalGuide: '攻略中可能安排 5–7 个景点',
      adjustedPlan: '保留 2–3 个核心活动，增加休息',
      reason: '同行有老人，降低单日负荷',
      persona: 'dre',
    });
  }

  if (summary.riskHints.some((r) => r.title.includes('驾驶'))) {
    adjustments.push({
      id: uid('adj'),
      category: 'Day 2 驾驶',
      originalGuide: '攻略单日移动较多',
      adjustedPlan: '建议拆为两天或删减低优先级景点',
      reason: '驾驶时长与疲劳风险需验证',
      persona: 'abu',
    });
  }

  if (summary.places.some((p) => p.name.includes('黑沙滩'))) {
    adjustments.push({
      id: uid('adj'),
      category: '黑沙滩',
      originalGuide: '攻略可能晚间到达',
      adjustedPlan: '调整至白天，并预留安全缓冲',
      reason: '海浪与光线条件',
      persona: 'abu',
    });
  }

  adjustments.push({
    id: uid('adj'),
    category: '信息可信度',
    originalGuide: '攻略作者经验',
    adjustedPlan: '标为 L1，关键约束待 L3–L4 验证',
    reason: '不将博主观点等同于官方事实',
    persona: 'neptune',
  });

  return {
    id: uid('candidate'),
    sourceGuideIds: guideIds,
    status: 'DRAFT',
    retainedItems: summary.places.slice(0, 5).map((p) => p.name),
    modifiedItems: adjustments.map((a) => a.category),
    rejectedItems: [],
    decisionReasons: adjustments.map((a) => a.reason ?? a.adjustedPlan),
    adjustments,
    disclaimer:
      '这是以攻略为灵感生成的行程草案，尚未完成全部约束验证。进入规划工作台后可继续审议与调整。',
  };
}

/** 将攻略摘要 + 用户条件拼成 NL 创建行程的 prompt（降级创建 trip 用） */
export function buildNlPromptFromGuide(
  summary: GuideBundleSummary,
  tripContext: GuideTripContext,
): string {
  const placeList = summary.places.map((p) => p.name).join('、');
  const parts = [
    '请根据以下从攻略整理的灵感，为我生成可执行行程草案（需验证约束，不要照抄攻略）：',
    tripContext.destination || summary.destinationHint
      ? `目的地：${tripContext.destination ?? summary.destinationHint}`
      : null,
    tripContext.startDate && tripContext.endDate
      ? `日期：${tripContext.startDate} 至 ${tripContext.endDate}`
      : summary.suggestedDays
        ? `约 ${summary.suggestedDays} 天`
        : null,
    placeList ? `重点地点：${placeList}` : null,
    tripContext.transportMode ? `交通：${tripContext.transportMode}` : null,
    tripContext.travelerProfile ? `同行：${tripContext.travelerProfile}` : null,
    tripContext.mustKeepExperiences?.length
      ? `必须保留：${tripContext.mustKeepExperiences.join('、')}`
      : null,
    `体验主线：${summary.themeSummary}`,
    summary.riskHints.length
      ? `需注意：${summary.riskHints.map((r) => r.title).join('；')}`
      : null,
  ].filter(Boolean);
  return parts.join('\n');
}
