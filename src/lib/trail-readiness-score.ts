import type { RouteDirection } from '@/types/places-routes';
import type { HikingTrailDetail } from '@/types/hiking-trail-detail';
import {
  hasMeaningfulHikingDetail,
  listReadinessScore,
  pickRiskMatrixRows,
} from '@/lib/hiking-trail-detail-ui';

export type TrailReadinessResult = {
  score: number;
  status: 'go' | 'caution' | 'no-go';
  headlineZh: string;
  summaryZh: string;
  blockers: string[];
  cautions: string[];
  factors: {
    season: { label: string; score: number; detailZh?: string };
    weather: { label: string; score: number; detailZh?: string };
    terrain: { label: string; score: number; detailZh?: string };
    fitness: { label: string; score: number; detailZh?: string };
  };
  /** 服务端四象限（有则 UI 标注「服务端评估」） */
  factorsFromServer?: boolean;
};

function monthScore(trail: RouteDirection): number {
  const month = new Date().getMonth() + 1;
  const best = trail.seasonality?.bestMonths ?? [];
  const avoid = trail.seasonality?.avoidMonths ?? [];
  if (avoid.includes(month)) return 35;
  if (best.includes(month)) return 95;
  return 65;
}

function weatherScore(hd?: HikingTrailDetail): number {
  const level = hd?.weatherRisk?.level?.toLowerCase() ?? '';
  if (level.includes('high') || level.includes('extreme')) return 40;
  if (level.includes('medium') || level.includes('moderate')) return 70;
  if (level.includes('low')) return 90;
  return 75;
}

function terrainScore(hd?: HikingTrailDetail, trail?: RouteDirection): number {
  const rows = pickRiskMatrixRows(hd);
  if (!rows.length && !trail?.riskProfile) return 70;
  let s = 85;
  for (const row of rows) {
    const label = `${row.labelCN ?? ''}${row.label ?? ''}${row.value ?? ''}`.toLowerCase();
    if (row.level === 'high' || /高|危险/.test(label)) s -= 8;
    if (/涉水|河流/.test(label) && /有|是|yes|true/i.test(row.value ?? '')) s -= 8;
    if (/高反|海拔/.test(label)) s -= 10;
  }
  if (trail?.riskProfile?.altitudeSickness) s -= 8;
  return Math.max(30, s);
}

function fitnessScore(hd?: HikingTrailDetail): number {
  const verdicts = hd?.fitnessMatch?.dayPaceVerdict ?? [];
  if (!verdicts.length) return 72;
  const hard = verdicts.filter((v) => /紧|难|超|不建议/i.test(v.noteZh ?? '')).length;
  const ratio = hard / verdicts.length;
  return Math.round(90 - ratio * 40);
}

export function computeTrailReadiness(
  trail: RouteDirection,
  hd?: HikingTrailDetail
): TrailReadinessResult {
  const apiScore = listReadinessScore(trail) ?? hd?.summary?.readinessScore;
  const season = monthScore(trail);
  const weather = weatherScore(hd);
  const terrain = terrainScore(hd, trail);
  const fitness = fitnessScore(hd);

  const computed = Math.round(
    apiScore ??
      season * 0.25 + weather * 0.25 + terrain * 0.3 + fitness * 0.2
  );

  const blockers: string[] = [];
  const cautions: string[] = [];

  if (trail.seasonality?.avoidMonths?.includes(new Date().getMonth() + 1)) {
    blockers.push('当前月份在避免季节列表中');
  }
  hd?.hardGates?.slice(0, 3).forEach((g) => cautions.push(g.ruleZh));
  if (hd?.weatherRisk?.headlineZh) cautions.push(hd.weatherRisk.headlineZh);
  if (!hasMeaningfulHikingDetail(hd)) {
    cautions.push('路线徒步详情数据不完整，评估仅供参考');
  }

  const score = Math.min(100, Math.max(0, computed));
  let status: TrailReadinessResult['status'] = 'go';
  if (score < 50 || blockers.length > 0) status = 'no-go';
  else if (score < 75 || cautions.length > 2) status = 'caution';

  const headlineZh =
    status === 'go'
      ? '可走指数良好，建议完成准备清单后出发'
      : status === 'caution'
        ? '存在需注意因素，建议查看风险与装备'
        : '不建议近期出发，请调整日期或路线';

  return {
    score,
    status,
    headlineZh,
    summaryZh: `${trail.nameCN} · ${trail.countryCode}`,
    blockers,
    cautions,
    factors: {
      season: { label: '季节匹配', score: season },
      weather: { label: '天气风险', score: weather },
      terrain: { label: '地形风险', score: terrain },
      fitness: { label: '体能匹配', score: fitness },
    },
  };
}
