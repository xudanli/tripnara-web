/** 成员偏好问卷 — 点选选项（写入现有 draft 字符串字段，无需改 BFF） */

export const MEMBER_ONBOARDING_MULTI_SEP = '、';

export const CORE_WISH_OPTIONS = [
  '自然风光',
  '美食探索',
  '轻松不赶路',
  '摄影打卡',
  '在地文化',
  '亲子互动',
  '冒险体验',
  '温泉疗愈',
  '观鲸观鸟',
  '购物休闲',
  '极光星空',
  '历史人文',
] as const;

export const MUST_EXPERIENCE_OPTIONS = [
  '徒步',
  '温泉',
  '摄影',
  '当地美食',
  '博物馆',
  '冰川',
  '火山',
  '骑行',
  '观鲸',
  '购物',
  '农场体验',
  '夜观极光',
] as const;

export const AVOID_EXPERIENCE_OPTIONS = [
  '高强度徒步',
  '红眼航班',
  '长时间车程',
  '寒冷户外久留',
  '拥挤景点',
  '刺激游乐',
  '熬夜行程',
  '野外露营',
  '深海潜水',
  '长时间排队',
] as const;

export const LODGING_OPTIONS = [
  '安静好睡',
  '靠近市中心',
  '双床/分开睡',
  '大床房',
  '有厨房',
  '无障碍',
  '窗外景观',
  '经济实用',
  '品质舒适',
  '民宿特色',
] as const;

export const DIET_OPTIONS = [
  '无特殊要求',
  '素食',
  '清真',
  '无麸质',
  '海鲜过敏',
  '坚果过敏',
  '乳糖不耐',
  '不吃辣',
  '低糖低盐',
] as const;

export const HEALTH_OPTIONS = [
  '无特殊状况',
  '需要充足休息',
  '少步行/关节注意',
  '高原需注意',
  '需定时用药',
  '晕车晕船',
  '需婴儿推车',
] as const;

export const PRIVATE_CONCERN_OPTIONS = [
  '希望多拍照少赶路',
  '介意和大家分开',
  '住宿隐私敏感',
  '个人额外支出需控制',
  '社交场合有顾虑',
  '暂无补充',
] as const;

export const GUARDIAN_FOR_OPTIONS = ['父母', '子女', '配偶/伴侣', '其他家人'] as const;

export const WALK_LIMIT_OPTIONS: ReadonlyArray<{ value: number | undefined; label: string }> = [
  { value: undefined, label: '不限' },
  { value: 5, label: '≤ 5 公里/天' },
  { value: 8, label: '≤ 8 公里/天' },
  { value: 12, label: '≤ 12 公里/天' },
  { value: 15, label: '≤ 15 公里/天' },
];

export const PACE_LABELS: Record<'relaxed' | 'moderate' | 'active', string> = {
  relaxed: '轻松 · 多休息',
  moderate: '适中 · 张弛有度',
  active: '紧凑 · 多活动',
};

export const SPENDING_LABELS: Record<'budget' | 'moderate' | 'premium', string> = {
  budget: '经济 · 控制个人额外支出',
  moderate: '适中 · 关键体验愿意付费',
  premium: '品质 · 体验优先',
};

export const SPLIT_LABELS: Record<'yes' | 'no' | 'depends', string> = {
  yes: '可以接受',
  depends: '视具体情况',
  no: '希望全程同行',
};

export function splitOnboardingSelections(
  value: string,
  knownOptions: readonly string[],
): { selected: string[]; other: string } {
  if (!value.trim()) return { selected: [], other: '' };
  const tokens = value
    .split(/[、,，;；]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const knownSet = new Set(knownOptions);
  const selected: string[] = [];
  const otherParts: string[] = [];
  for (const token of tokens) {
    if (knownSet.has(token)) {
      if (!selected.includes(token)) selected.push(token);
    } else {
      otherParts.push(token);
    }
  }
  return { selected, other: otherParts.join(MEMBER_ONBOARDING_MULTI_SEP) };
}

export function joinOnboardingSelections(selected: string[], other?: string): string {
  const parts = [...selected];
  const trimmed = other?.trim();
  if (trimmed) parts.push(trimmed);
  return parts.filter(Boolean).join(MEMBER_ONBOARDING_MULTI_SEP);
}

/** 从 coreWishes 数组拆出已知选项与自定义 */
export function splitCoreWishes(wishes: string[]): { selected: string[]; other: string } {
  const knownSet = new Set(CORE_WISH_OPTIONS);
  const selected: string[] = [];
  const otherParts: string[] = [];
  for (const w of wishes.map((x) => x.trim()).filter(Boolean)) {
    if (knownSet.has(w as (typeof CORE_WISH_OPTIONS)[number])) {
      if (!selected.includes(w)) selected.push(w);
    } else {
      otherParts.push(w);
    }
  }
  return { selected, other: otherParts.join(MEMBER_ONBOARDING_MULTI_SEP) };
}

export function joinCoreWishes(selected: string[], other?: string, max = 3): string[] {
  const parts = [...selected];
  const trimmed = other?.trim();
  if (trimmed) parts.push(trimmed);
  return parts.filter(Boolean).slice(0, max);
}

export function splitPrivateConcerns(notes: string): { selected: string[]; other: string } {
  if (!notes.trim()) {
    return { selected: ['暂无补充'], other: '' };
  }
  return splitOnboardingSelections(notes, PRIVATE_CONCERN_OPTIONS);
}

export function joinPrivateConcerns(selected: string[], other?: string): string {
  if (selected.includes('暂无补充') && !other?.trim()) return '';
  const filtered = selected.filter((s) => s !== '暂无补充');
  return joinOnboardingSelections(filtered, other);
}
