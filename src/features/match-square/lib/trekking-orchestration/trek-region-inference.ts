/** 从愿景 / chips 推断徒步区域焦点 — 驱动标题与路线候选过滤 */
export type TrekRegionFocus =
  | 'iceland'
  | 'chuanxi'
  | 'yunnan'
  | 'xinjiang'
  | 'zhejiang'
  | 'generic';

const ICELAND_RE =
  /冰岛|Iceland|Laugavegur|Landmannalaugar|兰格维格|Þórsmörk|Thorsmork|Landmannalaugar|内陆高地/i;
const CHUANXI_RE = /川西|长坪沟|毕棚沟|贡嘎|四姑娘/i;
const YUNNAN_RE = /雨崩|梅里|天堂湖|滇/i;
const XINJIANG_RE = /乌孙|独库|新疆/i;
const ZHEJIANG_RE = /浙西|三尖|十里琅珰|法喜寺|杭州/i;

export function inferTrekRegionFocus(text: string, chips: string[] = []): TrekRegionFocus {
  const blob = [text, ...chips].join(' ');
  const hits: TrekRegionFocus[] = [];
  if (ICELAND_RE.test(blob)) hits.push('iceland');
  if (CHUANXI_RE.test(blob)) hits.push('chuanxi');
  if (YUNNAN_RE.test(blob)) hits.push('yunnan');
  if (XINJIANG_RE.test(blob)) hits.push('xinjiang');
  if (ZHEJIANG_RE.test(blob)) hits.push('zhejiang');
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) return 'generic';
  // 多区域提及时不强行绑单一目的地
  return 'generic';
}

/** 路线 key 前缀 / 模式 → 区域 */
function candidateRegion(key: string, label: string): TrekRegionFocus | null {
  const blob = `${key} ${label}`;
  if (/IS_|冰岛|Laugavegur|Iceland/i.test(blob)) return 'iceland';
  if (/CHUANXI|川西|长坪沟|毕棚沟|贡嘎/i.test(blob)) return 'chuanxi';
  if (/YUBENG|雨崩|梅里/i.test(blob)) return 'yunnan';
  if (/WUSUN|乌孙|新疆/i.test(blob)) return 'xinjiang';
  if (/ZHEXI|HANGZHOU|三尖|琅珰/i.test(blob)) return 'zhejiang';
  return null;
}

export function filterRouteCandidatesForRegion<
  T extends { routeDirectionKey: string; label: string; availability: string }
>(candidates: T[], region: TrekRegionFocus): T[] {
  if (region === 'generic') return candidates;

  const matched = candidates.filter((c) => {
    const r = candidateRegion(c.routeDirectionKey, c.label);
    return r === region;
  });

  // 愿景明确单一区域时，只展示该区域；无匹配则回退全集
  return matched.length > 0 ? matched : candidates;
}

export function heavyTrekDisplayHeadline(region: TrekRegionFocus): string {
  switch (region) {
    case 'iceland':
      return '🏔️ 冰岛重装 · 离线 DEM';
    case 'chuanxi':
      return '🏔️ 川西重装 · 离线 DEM';
    default:
      return '🏔️ 重装徒步 · 离线 DEM';
  }
}

export function lightTrekDisplayHeadline(region: TrekRegionFocus): string {
  switch (region) {
    case 'yunnan':
      return '🪵 雨崩 · DYL 人生设计局';
    case 'xinjiang':
      return '🪵 乌孙 · DYL 人生设计局';
    default:
      return '🪵 轻装隐居 · DYL 人生设计局';
  }
}

export function speedTrekDisplayHeadline(region: TrekRegionFocus): string {
  return region === 'zhejiang'
    ? '🏃 浙西速攀 · Fast & Light'
    : '🏃 山野速攀 · Fast & Light';
}

export function orchestrationDisplayHeadline(
  scriptId: string,
  region: TrekRegionFocus
): string {
  switch (scriptId) {
    case 'chuanxi_heavy_trek':
      return heavyTrekDisplayHeadline(region);
    case 'light_trek_dyl_retreat':
      return lightTrekDisplayHeadline(region);
    case 'weekend_fast_light_trek':
      return speedTrekDisplayHeadline(region);
    default:
      return '🥾 Premium Trekking';
  }
}
