export type RecruitmentDestRegionId =
  | 'cn_nw'
  | 'cn_sw'
  | 'cn_east'
  | 'is'
  | 'eu'
  | 'sea'
  | 'custom';

export type RecruitmentDestSubOption = {
  id: string;
  label: string;
  /** listing 池用的 destination_scope */
  scope: string;
};

export type RecruitmentDestRegion = {
  id: RecruitmentDestRegionId;
  label: string;
  hint: string;
};

export const RECRUITMENT_DEST_REGIONS: RecruitmentDestRegion[] = [
  { id: 'cn_nw', label: '国内 · 西北', hint: '青甘、新疆、阿勒泰' },
  { id: 'cn_sw', label: '国内 · 西南', hint: '云南、川西、贵州' },
  { id: 'cn_east', label: '国内 · 华东/华南', hint: '江浙、福建、粤港澳' },
  { id: 'is', label: '冰岛', hint: '南岸、高地、环岛' },
  { id: 'eu', label: '欧洲其他', hint: '北欧、阿尔卑斯、地中海' },
  { id: 'sea', label: '东南亚', hint: '泰北、巴厘岛、越南' },
  { id: 'custom', label: '其他 / 手动输入', hint: '下一步自己写范围' },
];

export const RECRUITMENT_DEST_SUBREGIONS: Record<
  RecruitmentDestRegionId,
  RecruitmentDestSubOption[]
> = {
  cn_nw: [
    { id: 'qinggan', label: '青甘大环', scope: '西北 · 青甘环线' },
    { id: 'altay', label: '阿勒泰', scope: '西北 · 阿勒泰' },
    { id: 'xj', label: '新疆', scope: '西北 · 新疆' },
    { id: 'custom', label: '其他西北一带', scope: '西北' },
  ],
  cn_sw: [
    { id: 'yunnan', label: '云南 · 滇西北', scope: '云南 · 滇西北' },
    { id: 'sichuan', label: '川西', scope: '西南 · 川西' },
    { id: 'guizhou', label: '贵州', scope: '西南 · 贵州' },
    { id: 'custom', label: '其他西南一带', scope: '西南' },
  ],
  cn_east: [
    { id: 'zhejiang', label: '江浙', scope: '华东 · 江浙' },
    { id: 'fujian', label: '福建', scope: '华东 · 福建' },
    { id: 'gba', label: '粤港澳', scope: '华南 · 粤港澳' },
    { id: 'custom', label: '其他华东/华南', scope: '华东/华南' },
  ],
  is: [
    { id: 'south', label: '南岸', scope: '冰岛 · 南岸' },
    { id: 'highland', label: '高地', scope: '冰岛 · 高地' },
    { id: 'ring', label: '环岛', scope: '冰岛 · 环岛' },
    { id: 'custom', label: '其他冰岛一带', scope: '冰岛' },
  ],
  eu: [
    { id: 'nordic', label: '北欧', scope: '欧洲 · 北欧' },
    { id: 'alps', label: '阿尔卑斯', scope: '欧洲 · 阿尔卑斯' },
    { id: 'med', label: '地中海', scope: '欧洲 · 地中海' },
    { id: 'custom', label: '其他欧洲', scope: '欧洲' },
  ],
  sea: [
    { id: 'thai', label: '泰北', scope: '东南亚 · 泰北' },
    { id: 'bali', label: '巴厘岛', scope: '东南亚 · 巴厘岛' },
    { id: 'vn', label: '越南', scope: '东南亚 · 越南' },
    { id: 'custom', label: '其他东南亚', scope: '东南亚' },
  ],
  custom: [],
};

export function resolveRecruitmentDestinationScope(
  regionId: RecruitmentDestRegionId,
  subId: string | null,
  customDraft?: string
): string {
  if (regionId === 'custom') {
    return customDraft?.trim() || '';
  }
  const subs = RECRUITMENT_DEST_SUBREGIONS[regionId];
  const match = subs.find((s) => s.id === subId);
  return match?.scope ?? subs[0]?.scope ?? '';
}

export function inferRegionFromScope(scope: string): RecruitmentDestRegionId | null {
  const s = scope.trim();
  if (!s) return null;
  if (/冰岛/.test(s)) return 'is';
  if (/西北|青甘|阿勒泰|新疆/.test(s)) return 'cn_nw';
  if (/云南|川西|西南|贵州/.test(s)) return 'cn_sw';
  if (/华东|华南|江浙|福建|粤港澳/.test(s)) return 'cn_east';
  if (/欧洲|北欧|阿尔卑斯|地中海/.test(s)) return 'eu';
  if (/东南亚|泰北|巴厘|越南/.test(s)) return 'sea';
  return 'custom';
}
