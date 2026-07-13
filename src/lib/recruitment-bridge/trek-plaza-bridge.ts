import type {
  PlanningStyle,
  RecruitmentPostCard,
  TrekActivityProfile,
} from '@/types/match-square';

export type { TrekActivityProfile };

export type TrekScenarioMeta = {
  id: TrekActivityProfile;
  label: string;
  emoji: string;
  planningStyle: PlanningStyle;
  defaultSlots: number;
  budgetMinRmb?: number;
  budgetMaxRmb?: number;
  visionTemplate: string;
};

/** Premium Trekking 三剧本 — 与 Vibe LLM lexicon 对齐 */
export const TREK_SCENARIOS: Record<TrekActivityProfile, TrekScenarioMeta> = {
  heavy_pack: {
    id: 'heavy_pack',
    label: '川西重装 · 离线高程行军',
    emoji: '🏔️',
    planningStyle: 'co_planning',
    defaultSlots: 2,
    budgetMinRmb: 2000,
    budgetMaxRmb: 5000,
    visionTemplate:
      '6月下旬端午前后，打算去川西长坪沟穿毕棚沟，或者搞次贡嘎大环线重装徒步。不搞那种有马帮全包的保姆团，全程自己背负、扎营。路上可能会遇到高反、失温、极端暴风雪，对体能和意志力要求极高。我已经把这一路的 DEM 数字高程模型和多源卫星路径图全部导入设备了，有详细的 Plan B。搭子要理工科、泛科技圈的硬核户外老炮，懂得户外无痕山林（LNT）法则，遇到危险能冷静执行数据决策。最好是 QS50 硕士或者大厂专家，信用必须极佳，别在雪山上掉链子。',
  },
  light_trek: {
    id: 'light_trek',
    label: '轻装隐居 · DYL 人生设计局',
    emoji: '🪵',
    planningStyle: 'co_planning',
    defaultSlots: 2,
    visionTemplate:
      '大厂刚 Feature Freeze，整个人被精神内耗空了，满身班味。6月中下旬想去新疆乌孙古道或者川西雨崩搞次轻装徒步（马帮驼装备，人轻装走）。不想赶路，白天就在天堂湖边或者雪山脚下发呆、看流云，晚上在客栈里组个局。我想带一套 Stanford 的 DYL（设计人生）画布框架，大家就着星空，帮彼此做一次下半年的职场转型或创业复盘。搭子要大厂高管、产品总监或者金融圈投资人，学历要高。需要你具备极高的倾听带宽，拒绝爹味说教和无效的职场八卦，让我们在旷野里互相疗愈。',
  },
  speed_ascent: {
    id: 'speed_ascent',
    label: '山野速攀 · 止于呼吸的轻量化',
    emoji: '🏃',
    planningStyle: 'casual_play',
    defaultSlots: 2,
    visionTemplate:
      '6月找个周末，想去杭州周边的百公里越野线（如浙西三尖、或者法喜寺-十里琅珰速攀）。不搞无效社交，不聊大厂八卦，也不用互相拍照。就是纯粹的极致轻量化（Fast & Light）速攀，把心率拉到 160，用物理痛苦去清洗脑子里的代码和融资焦虑。白天专注呼吸和脚下，下山之后在山脚小酒馆喝杯精酿原地解散。搭子要自律、体能过硬、同样高压工作的白领极客，一路上保持高阶的边界感与默契的沉默。',
  },
};

export const TREK_ACTIVITY_LABELS: Record<TrekActivityProfile, string> = {
  heavy_pack: '重装自负重',
  light_trek: '轻装隐居',
  speed_ascent: '山野速攀',
};

export type TrekPlazaSearchParams = {
  routeDirectionId?: number;
  routeDirectionName?: string;
  activityProfile?: TrekActivityProfile;
  vibeSeed?: string;
};

function isTrekActivityProfile(v: string | null): v is TrekActivityProfile {
  return v === 'heavy_pack' || v === 'light_trek' || v === 'speed_ascent';
}

/** 从愿景 / 路线名推断徒步剧本 */
export function inferActivityProfileFromText(text: string): TrekActivityProfile | null {
  const t = text.trim();
  if (!t) return null;
  if (/速攀|Fast\s*&\s*Light|心率.*160|三尖|十里琅珰|法喜寺|百公里越野|默契.*沉默|零社交/i.test(t)) {
    return 'speed_ascent';
  }
  if (/DYL|设计人生|班味|雨崩|乌孙|马帮|轻装|星空围炉|疗愈|发呆/i.test(t)) {
    return 'light_trek';
  }
  if (/重装|自负重|DEM|数字高程|贡嘎|毕棚沟|长坪沟|扎营|暴风雪|LNT/i.test(t)) {
    return 'heavy_pack';
  }
  return null;
}

export function inferActivityProfileFromTrail(opts: {
  nameCN?: string;
  nameEN?: string;
  routeDirectionName?: string;
  tags?: string[];
}): TrekActivityProfile | null {
  const blob = [opts.nameCN, opts.nameEN, opts.routeDirectionName, ...(opts.tags ?? [])]
    .filter(Boolean)
    .join(' ');
  return inferActivityProfileFromText(blob);
}

export function parseTrekPlazaSearchParams(
  params: URLSearchParams | Record<string, string | undefined>
): TrekPlazaSearchParams {
  const get = (key: string) =>
    params instanceof URLSearchParams ? params.get(key) ?? undefined : params[key];

  const rdRaw = get('routeDirectionId');
  const routeDirectionId =
    rdRaw != null && rdRaw !== '' && Number.isFinite(Number(rdRaw)) ? Number(rdRaw) : undefined;

  const activityRaw = get('activityProfile') ?? get('trekProfile');
  const activityProfile = activityRaw && isTrekActivityProfile(activityRaw) ? activityRaw : undefined;

  return {
    routeDirectionId,
    routeDirectionName: get('routeDirectionName')?.trim() || undefined,
    activityProfile,
    vibeSeed: get('vibeSeed')?.trim() || undefined,
  };
}

export function buildTrekRecruitmentUrl(input: {
  routeDirectionId: number;
  routeDirectionName?: string;
  activityProfile?: TrekActivityProfile;
  vibeSeed?: string;
}): string {
  const q = new URLSearchParams();
  q.set('routeDirectionId', String(input.routeDirectionId));
  if (input.routeDirectionName) q.set('routeDirectionName', input.routeDirectionName);
  if (input.activityProfile) q.set('activityProfile', input.activityProfile);
  if (input.vibeSeed) q.set('vibeSeed', input.vibeSeed);
  return `/dashboard/trusted-projects/new?${q.toString()}`;
}

/** 端午前后默认窗口（6 月下旬） */
function defaultLateJuneDates(): { startDate: string; endDate: string } {
  const year = new Date().getFullYear();
  return { startDate: `${year}-06-19`, endDate: `${year}-06-22` };
}

/** 最近一个周六单日 */
function nextWeekendDay(): { startDate: string; endDate: string } {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSat = day === 6 ? 0 : (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSat);
  const iso = d.toISOString().slice(0, 10);
  return { startDate: iso, endDate: iso };
}

export function resolveTrekVisionSeed(
  activityProfile: TrekActivityProfile | undefined,
  vibeSeed?: string
): string {
  if (vibeSeed?.trim()) return vibeSeed.trim();
  if (activityProfile) return TREK_SCENARIOS[activityProfile].visionTemplate;
  return '';
}

export function buildRecruitmentInitialFromTrek(
  trek: TrekPlazaSearchParams,
  opts?: { destination?: string }
): Partial<RecruitmentPostCard> & {
  vibeRawText?: string;
  planningStyle?: PlanningStyle;
  slotsNeeded?: number;
  budgetMinRmb?: number;
  budgetMaxRmb?: number;
  startDate?: string;
  endDate?: string;
} {
  const profile =
    trek.activityProfile ??
    inferActivityProfileFromText(trek.vibeSeed ?? '') ??
    inferActivityProfileFromText(trek.routeDirectionName ?? '');

  const scenario = profile ? TREK_SCENARIOS[profile] : null;
  const vision = resolveTrekVisionSeed(profile ?? undefined, trek.vibeSeed);

  const dates =
    profile === 'speed_ascent' ? nextWeekendDay() : defaultLateJuneDates();

  return {
    routeDirectionId: trek.routeDirectionId ?? null,
    routeDirectionName: trek.routeDirectionName ?? null,
    activityProfile: profile ?? null,
    destination: opts?.destination ?? '',
    recruitmentVision: vision || undefined,
    vibeRawText: vision || undefined,
    planningStyle: scenario?.planningStyle,
    slotsNeeded: scenario?.defaultSlots ?? 2,
    budgetMinRmb: scenario?.budgetMinRmb,
    budgetMaxRmb: scenario?.budgetMaxRmb,
    startDate: dates.startDate,
    endDate: dates.endDate,
  };
}

export function trekBridgeHeadline(post: Pick<RecruitmentPostCard, 'activityProfile' | 'routeDirectionName'>): string | null {
  if (post.activityProfile) {
    const s = TREK_SCENARIOS[post.activityProfile];
    return `${s.emoji} ${s.label}`;
  }
  if (post.routeDirectionName) return `🥾 ${post.routeDirectionName}`;
  return null;
}
