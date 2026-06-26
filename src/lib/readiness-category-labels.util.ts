/** 准备度 findings 分类 → 用户可见标题 */
export function getReadinessCategoryDisplay(
  category: string,
  isZh: boolean,
): { icon: string; title: string; subtitle?: string } {
  const map: Record<string, { icon: string; zh: string; en: string; subtitleEn?: string }> = {
    gear_packing: { icon: '🧳', zh: '装备打包清单', en: 'Gear Packing', subtitleEn: 'Gear Packing' },
    safety_hazards: { icon: '🛡️', zh: '安全与打包', en: 'Safety & Packing' },
    weather: { icon: '🌤️', zh: '天气准备', en: 'Weather Prep' },
    gear: { icon: '🧳', zh: '装备准备', en: 'Gear' },
    evidence: { icon: '📋', zh: '证据覆盖', en: 'Evidence' },
    schedule: { icon: '📅', zh: '行程可行性', en: 'Schedule' },
    transport: { icon: '🚗', zh: '交通确定性', en: 'Transport' },
    safety: { icon: '⚠️', zh: '安全风险', en: 'Safety' },
    buffer: { icon: '⏱️', zh: '缓冲时间', en: 'Buffers' },
    logistics: { icon: '📦', zh: '后勤准备', en: 'Logistics' },
    health_insurance: { icon: '🏥', zh: '健康与保险', en: 'Health & Insurance' },
    other: { icon: '📌', zh: '其他', en: 'Other' },
  };

  const entry = map[category];
  if (entry) {
    const title = isZh ? entry.zh : entry.en;
    const subtitle = isZh && entry.subtitleEn ? entry.subtitleEn : undefined;
    return { icon: entry.icon, title, subtitle };
  }

  const fallback = category.replace(/_/g, ' ');
  return { icon: '📌', title: fallback };
}
