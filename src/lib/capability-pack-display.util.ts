import type { CapabilityPackEvaluateResultItem, CapabilityPackRule } from '@/api/readiness';
import type { TripReadinessPhase } from '@/lib/trip-readiness-phase.util';

/** 把后端技术指标转成用户能读懂的触发说明 */
export function humanizeTriggerReason(
  packType: string,
  rawReason: string | undefined,
  lang: 'zh' | 'en' = 'zh',
): string {
  if (!rawReason) {
    return lang === 'zh' ? '符合本行程特征' : 'Matches this trip profile';
  }

  if (lang === 'zh') {
    switch (packType) {
      case 'sparse_supply':
        return rawReason
          .replace(/道路密度\s*\d+%/g, '部分路段较偏远')
          .replace(/补给点密度\s*\d+%/g, '沿途加油站/超市较少')
          .replace(/路线长度\s*(\d+)km/g, '全程约 $1 公里');
      case 'seasonal_road':
        return rawReason
          .replace(/山区路线/g, '途经山区/高地')
          .replace(/冬季出行/g, '冬季自驾');
      case 'high_altitude':
        return rawReason.replace(/平均海拔\s*(\d+)m/g, '平均海拔约 $1 米');
      default:
        return rawReason;
    }
  }

  return rawReason;
}

export function getPackOneLiner(packType: string, lang: 'zh' | 'en' = 'zh'): string {
  const zh: Record<string, string> = {
    sparse_supply: '长途自驾时，提前规划加油、备粮和离线导航。',
    seasonal_road: '冬季山区自驾，需准备冬季轮胎并预留额外时间。',
    high_altitude: '高海拔活动需关注适应与保暖。',
    permit_checkpoint: '途经检查站/许可区，提前办手续。',
    emergency: '偏远路线，建议准备应急通信与告知行程。',
  };
  const en: Record<string, string> = {
    sparse_supply: 'Plan fuel, supplies, and offline maps for long drives.',
    seasonal_road: 'Winter mountain driving needs winter tires and extra time.',
    high_altitude: 'Prepare for altitude acclimatization and warmth.',
    permit_checkpoint: 'Permits or checkpoints may apply—prepare documents early.',
    emergency: 'Remote routes—carry emergency comms and share your plan.',
  };
  const map = lang === 'zh' ? zh : en;
  return map[packType] ?? (lang === 'zh' ? '针对本行程的特殊准备建议' : 'Special preparation for this trip');
}

export function shouldDeferLiveUrgency(
  packType: string,
  phase: TripReadinessPhase,
): boolean {
  return phase === 'planning' && (packType === 'seasonal_road' || packType === 'sparse_supply');
}

export function getTriggeredRules(result: CapabilityPackEvaluateResultItem): CapabilityPackRule[] {
  return (result.rules ?? []).filter((rule) => rule.triggered);
}

export function sortRulesByPriority(rules: CapabilityPackRule[]): CapabilityPackRule[] {
  const order = { blocker: 0, must: 1, should: 2, optional: 3 };
  return [...rules].sort(
    (a, b) => (order[a.level as keyof typeof order] ?? 9) - (order[b.level as keyof typeof order] ?? 9),
  );
}

export function primaryHazardSummary(result: CapabilityPackEvaluateResultItem): string | undefined {
  return result.hazards?.[0]?.summary;
}
