import { splitMustTripInvolvesMessage } from '@/lib/readiness-message-split';

export { splitMustTripInvolvesMessage } from '@/lib/readiness-message-split';

/** 风险 type 代码 → 展示文案（后端未本地化时的前端兜底） */
export const RISK_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  WEATHER: { zh: '天气风险', en: 'Weather risk' },
  TERRAIN: { zh: '地形风险', en: 'Terrain risk' },
  SAFETY: { zh: '安全风险', en: 'Safety risk' },
  LOGISTICS: { zh: '后勤风险', en: 'Logistics risk' },
  ROAD: { zh: '道路风险', en: 'Road risk' },
  WATER: { zh: '水域风险', en: 'Water risk' },
  OTHER: { zh: '其他风险', en: 'Other risk' },
  weather: { zh: '天气风险', en: 'Weather risk' },
  weather_extreme: { zh: '极端天气', en: 'Extreme weather' },
  terrain: { zh: '地形风险', en: 'Terrain risk' },
  safety: { zh: '安全风险', en: 'Safety risk' },
  logistics: { zh: '后勤风险', en: 'Logistics risk' },
  logistics_remote: { zh: '偏远地区', en: 'Remote area' },
  road: { zh: '道路风险', en: 'Road risk' },
  road_closure: { zh: '道路风险', en: 'Road risk' },
  winter_road_condition: { zh: '道路风险', en: 'Road risk' },
  driving_conditions: { zh: '道路风险', en: 'Road risk' },
  water_safety: { zh: '水域风险', en: 'Water risk' },
  COLD: { zh: '低温风险', en: 'Cold exposure' },
  cold: { zh: '低温风险', en: 'Cold exposure' },
  HEAT: { zh: '高温风险', en: 'Heat exposure' },
  heat: { zh: '高温风险', en: 'Heat exposure' },
  VOLCANIC: { zh: '火山/地热风险', en: 'Volcanic & geothermal' },
  volcanic: { zh: '火山/地热风险', en: 'Volcanic & geothermal' },
  supply_shortage: { zh: '补给短缺', en: 'Supply shortage' },
  altitude_sickness: { zh: '高反风险', en: 'Altitude sickness' },
  water: { zh: '水域风险', en: 'Water risk' },
  other: { zh: '其他风险', en: 'Other risk' },
};

const RISK_TYPE_CATEGORY: Record<string, 'weather' | 'terrain' | 'safety' | 'logistics' | 'other'> = {
  COLD: 'weather',
  cold: 'weather',
  HEAT: 'weather',
  heat: 'weather',
  WEATHER: 'weather',
  weather: 'weather',
  weather_extreme: 'weather',
  VOLCANIC: 'terrain',
  volcanic: 'terrain',
  TERRAIN: 'terrain',
  terrain: 'terrain',
  supply_shortage: 'logistics',
  supply: 'logistics',
  LOGISTICS: 'logistics',
  logistics: 'logistics',
  logistics_remote: 'logistics',
  ROAD: 'logistics',
  road: 'logistics',
  road_closure: 'logistics',
  driving_conditions: 'logistics',
  SAFETY: 'safety',
  safety: 'safety',
  altitude_sickness: 'safety',
  water_safety: 'safety',
  WATER: 'safety',
  water: 'safety',
};

/** 是否为未本地化的 type 代码（如 COLD、VOLCANIC） */
export function isRawRiskTypeCode(label: string | undefined, type: string | undefined): boolean {
  const t = label?.trim();
  if (!t) return false;
  if (type && t.toUpperCase() === type.toUpperCase()) return true;
  if (RISK_TYPE_LABELS[t] || RISK_TYPE_LABELS[t.toLowerCase()]) return true;
  return /^[A-Z][A-Z0-9_]*$/.test(t);
}

function lookupRiskTypeLabel(type: string | undefined, isZh: boolean): string | undefined {
  if (!type) return undefined;
  const entry = RISK_TYPE_LABELS[type] ?? RISK_TYPE_LABELS[type.toLowerCase()];
  return entry?.[isZh ? 'zh' : 'en'];
}

/** 卡片标题：中文界面优先中文，跳过原始 type 代码 */
export function resolveRiskTypeLabel(
  risk: { type?: string; typeLabel?: string; typeLabelEn?: string },
  isZh: boolean,
): string {
  const fromType = lookupRiskTypeLabel(risk.type, isZh);
  const pick = (label: string | undefined) => {
    if (!label?.trim()) return undefined;
    if (isRawRiskTypeCode(label, risk.type)) {
      return lookupRiskTypeLabel(label, isZh) ?? fromType;
    }
    return label.trim();
  };

  if (isZh) {
    return (
      pick(risk.typeLabel) ||
      fromType ||
      pick(risk.typeLabelEn) ||
      risk.type ||
      ''
    );
  }
  return (
    pick(risk.typeLabelEn) ||
    fromType ||
    pick(risk.typeLabel) ||
    risk.type ||
    ''
  );
}

export function resolveRiskCategoryKey(
  risk: { type?: string; category?: string },
): string | undefined {
  if (risk.category && risk.category !== 'other') return risk.category;
  if (!risk.type) return risk.category;
  return (
    RISK_TYPE_CATEGORY[risk.type] ??
    RISK_TYPE_CATEGORY[risk.type.toLowerCase()] ??
    risk.category
  );
}

/** 后端 risk-type-mapper 在无 summary 时填充的泛化模板句 */
const GENERIC_RISK_PATTERNS = [
  /天气相关风险，如极端天气、暴风雪等/,
  /地形复杂或危险，如陡峭山路/i,
  /可能影响行程执行/,
  /May affect trip execution/i,
  /Weather-related risks, such as extreme weather/i,
  /与本行程中上述地点相关/,
  /Related to the itinerary locations listed above/i,
];

/** 正文下方已有「关联行程点」时，去掉括号内的 POI 列表 */
export function stripItineraryPlaceSuffix(text: string): string {
  if (!text?.trim()) return '';
  return splitMustTripInvolvesMessage(text).lead;
}

export function isItineraryPlaceOnlyMessage(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const { lead, involves } = splitMustTripInvolvesMessage(t);
  return !lead && !!involves;
}

export function isGenericRiskPlaceholder(text: string | undefined | null): boolean {
  const t = (text || '').trim();
  if (!t) return true;
  return GENERIC_RISK_PATTERNS.some((re) => re.test(t));
}

export function pickRiskBodyText(risk: {
  summary?: string;
  message?: string;
  description?: string;
  impact?: string;
  isGenericTemplate?: boolean;
  mitigation?: string[];
  mitigations?: string[];
}): string {
  const candidates = [risk.summary, risk.message, risk.description].map((s) => (s || '').trim());
  const specific = candidates.find((c) => c && !isGenericRiskPlaceholder(c));
  if (specific) return specific;

  const mitigations = risk.mitigation?.length ? risk.mitigation : risk.mitigations;
  if (mitigations?.length) return mitigations[0];

  return candidates.find(Boolean) || '';
}
