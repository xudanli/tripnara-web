import {
  RECRUITMENT_DEST_REGIONS,
  RECRUITMENT_DEST_SUBREGIONS,
} from '@/lib/recruitment-destination-clarify';
import type { DestinationRegionOption } from '@/types/match-square';

/** mock / API 缺失时的兜底，id 与 recruitment-destination-clarify 一致 */
export function buildClarifyDestinationRegions(): DestinationRegionOption[] {
  return RECRUITMENT_DEST_REGIONS.map((region) => ({
    id: region.id,
    label: region.label,
    hint: region.hint,
    subScopes: (RECRUITMENT_DEST_SUBREGIONS[region.id] ?? []).map((sub) => ({
      id: sub.id,
      label: sub.label,
      scope: sub.scope,
    })),
  }));
}

export function resolveDestinationRegions(
  apiRegions: DestinationRegionOption[] | undefined
): DestinationRegionOption[] {
  return apiRegions?.length ? apiRegions : buildClarifyDestinationRegions();
}

export function findDestinationRegion(
  regions: DestinationRegionOption[],
  regionId: string | null | undefined
): DestinationRegionOption | undefined {
  if (!regionId) return undefined;
  return regions.find((r) => r.id === regionId);
}

export function findDestinationSubScope(
  regions: DestinationRegionOption[],
  regionId: string | null | undefined,
  subScopeId: string | null | undefined
) {
  const region = findDestinationRegion(regions, regionId);
  if (!region || !subScopeId) return undefined;
  return region.subScopes.find((s) => s.id === subScopeId);
}

export function resolveDestinationScopeFromIds(
  regions: DestinationRegionOption[],
  regionId: string | null | undefined,
  subScopeId: string | null | undefined,
  customDraft?: string
): string {
  if (regionId === 'custom') {
    return customDraft?.trim() || '';
  }
  const sub = findDestinationSubScope(regions, regionId, subScopeId);
  if (sub?.scope) return sub.scope;
  const region = findDestinationRegion(regions, regionId);
  const firstSub = region?.subScopes[0];
  return firstSub?.scope ?? '';
}

export function inferDestinationIdsFromScope(
  regions: DestinationRegionOption[],
  scope: string
): { destinationRegionId?: string; destinationSubScopeId?: string } {
  const trimmed = scope.trim();
  if (!trimmed) return {};

  for (const region of regions) {
    for (const sub of region.subScopes) {
      if (sub.scope && (trimmed === sub.scope || trimmed.includes(sub.scope) || sub.scope.includes(trimmed))) {
        return { destinationRegionId: region.id, destinationSubScopeId: sub.id };
      }
    }
  }

  for (const region of regions) {
    if (trimmed.includes(region.label) || region.label.includes(trimmed)) {
      const firstSub = region.subScopes[0];
      return {
        destinationRegionId: region.id,
        destinationSubScopeId: firstSub?.id,
      };
    }
  }

  if (/冰岛/.test(trimmed)) {
    const region = regions.find((r) => r.id === 'is');
    const sub =
      region?.subScopes.find((subScope) => /南岸/.test(trimmed) && subScope.id === 'south') ??
      region?.subScopes[0];
    return { destinationRegionId: region?.id, destinationSubScopeId: sub?.id };
  }
  if (/西北|青甘|阿勒泰|新疆/.test(trimmed)) {
    const region = regions.find((r) => r.id === 'cn_nw');
    const sub =
      region?.subScopes.find((s) =>
        /阿勒泰/.test(trimmed) ? s.id === 'altay' : /新疆/.test(trimmed) ? s.id === 'xj' : /青甘/.test(trimmed) ? s.id === 'qinggan' : false
      ) ?? region?.subScopes[0];
    return { destinationRegionId: region?.id, destinationSubScopeId: sub?.id };
  }
  if (/华东|华南|江浙|福建|粤港澳|浙西|杭州|三尖|琅珰/.test(trimmed)) {
    const region = regions.find((r) => r.id === 'cn_east');
    const sub =
      region?.subScopes.find((s) =>
        /浙西|杭州|三尖|琅珰/.test(trimmed) ? s.id === 'zhejiang' : false
      ) ?? region?.subScopes[0];
    return { destinationRegionId: region?.id, destinationSubScopeId: sub?.id };
  }
  if (/雨崩|梅里/.test(trimmed)) {
    const region = regions.find((r) => r.id === 'cn_sw');
    return { destinationRegionId: region?.id, destinationSubScopeId: 'yunnan' };
  }
  if (/川西|长坪沟|毕棚沟|贡嘎/.test(trimmed)) {
    const region = regions.find((r) => r.id === 'cn_sw');
    return { destinationRegionId: region?.id, destinationSubScopeId: 'sichuan' };
  }
  if (/乌孙|独库/.test(trimmed)) {
    const region = regions.find((r) => r.id === 'cn_nw');
    return { destinationRegionId: region?.id, destinationSubScopeId: 'xj' };
  }
  if (/云南|川西|西南|贵州/.test(trimmed)) {
    const region = regions.find((r) => r.id === 'cn_sw');
    return { destinationRegionId: region?.id, destinationSubScopeId: region?.subScopes[0]?.id };
  }
  if (/德国|鲁尔|欧洲|北欧|阿尔卑斯|地中海/.test(trimmed)) {
    const region = regions.find((r) => r.id === 'eu');
    const sub =
      region?.subScopes.find((s) =>
        /鲁尔|德国/.test(trimmed)
          ? s.id === 'custom'
          : /北欧/.test(trimmed)
            ? s.id === 'nordic'
            : /阿尔卑斯/.test(trimmed)
              ? s.id === 'alps'
              : /地中海/.test(trimmed)
                ? s.id === 'med'
                : false
      ) ?? region?.subScopes.find((s) => s.id === 'custom') ?? region?.subScopes[0];
    return { destinationRegionId: region?.id, destinationSubScopeId: sub?.id };
  }
  if (/东北|老工业|华北|内蒙/.test(trimmed)) {
    return { destinationRegionId: 'custom' };
  }

  return { destinationRegionId: 'custom' };
}

/** 从愿景全文推断目的地 id（API 只返回 destination 文案时的兜底） */
export function inferDestinationIdsFromVision(
  text: string,
  regions: DestinationRegionOption[]
): { destination?: string; destinationRegionId?: string; destinationSubScopeId?: string } {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const patterns: Array<[RegExp, string, string | undefined, string]> = [
    [/阿勒泰|喀纳斯/i, 'cn_nw', 'altay', '西北 · 阿勒泰'],
    [/新疆/i, 'cn_nw', 'xj', '西北 · 新疆'],
    [/青甘|青海湖|敦煌/i, 'cn_nw', 'qinggan', '西北 · 青甘环线'],
    [/东北|老工业基地/i, 'custom', undefined, '东北老工业基地'],
    [/德国|鲁尔区/i, 'eu', 'custom', '欧洲 · 德国鲁尔区'],
    [/新西兰/i, 'custom', undefined, '新西兰'],
    [/冰岛/i, 'is', 'south', '冰岛 · 南岸'],
    [/西藏|阿里/i, 'custom', undefined, '西藏 · 阿里'],
    [/雨崩|梅里|天堂湖/i, 'cn_sw', 'yunnan', '云南 · 雨崩'],
    [/川西|长坪沟|毕棚沟|贡嘎/i, 'cn_sw', 'sichuan', '西南 · 川西'],
    [/乌孙|独库/i, 'cn_nw', 'xj', '西北 · 新疆'],
    [/浙西|三尖|十里琅珰|法喜寺|杭州周边/i, 'cn_east', 'zhejiang', '华东 · 江浙'],
    [/云南|滇/i, 'cn_sw', 'yunnan', '云南 · 滇西北'],
  ];

  for (const [re, regionId, subId, label] of patterns) {
    if (re.test(trimmed)) {
      return {
        destination: label,
        destinationRegionId: regionId,
        destinationSubScopeId: subId,
      };
    }
  }

  const fromScope = inferDestinationIdsFromScope(regions, trimmed);
  if (fromScope.destinationRegionId) {
    const scope = resolveDestinationScopeFromIds(
      regions,
      fromScope.destinationRegionId,
      fromScope.destinationSubScopeId
    );
    return { ...fromScope, destination: scope || undefined };
  }

  return {};
}
