import type { CoverageMapResponse, ScoreFinding } from '@/api/readiness';

const EVIDENCE_LABELS: Record<string, string> = {
  opening_hours: '开放时间',
  weather: '天气数据',
  road_closure: '道路信息',
  booking_confirmation: '预订确认',
  permit: '许可证',
};

/**
 * /score findings 为空时，从覆盖地图数据还原维度详情（避免弹窗空白）
 */
export function buildDimensionFindingsFallback(
  dimension: string | null,
  coverageMapData: CoverageMapResponse | null,
): ScoreFinding[] {
  if (!dimension || !coverageMapData) return [];

  if (dimension === 'evidenceCoverage') {
    return coverageMapData.pois
      .filter((poi) => poi.coverageStatus !== 'covered')
      .map((poi) => {
        const missing = (poi.missingEvidence || [])
          .map((e) => EVIDENCE_LABELS[e] || e)
          .join('、');
        return {
          id: `fallback-evidence-${poi.id}`,
          type: poi.coverageStatus === 'uncovered' ? 'blocker' : 'must',
          category: 'evidence',
          message: missing
            ? `第${poi.day}天 · ${poi.name}：缺少${missing}`
            : `第${poi.day}天 · ${poi.name}：证据不完整`,
          severity: poi.coverageStatus === 'uncovered' ? 'high' : 'medium',
          affectedDays: [poi.day],
          actionRequired: poi.missingEvidence?.length
            ? `补充: ${poi.missingEvidence.join(', ')}`
            : undefined,
        };
      });
  }

  if (dimension === 'transportCertainty') {
    const items: ScoreFinding[] = [];
    for (const segment of coverageMapData.segments) {
      const from = coverageMapData.pois.find((p) => p.id === segment.fromPoiId);
      const to = coverageMapData.pois.find((p) => p.id === segment.toPoiId);
      if (!from || !to) continue;
      for (const hazard of segment.hazards || []) {
        items.push({
          id: `fallback-transport-${segment.id}-${hazard.type}`,
          type: hazard.severity === 'high' ? 'must' : 'should',
          category: 'transport',
          message: `第${segment.day}天 · ${from.name} → ${to.name} · ${hazard.message}`,
          severity: hazard.severity,
          affectedDays: [segment.day],
        });
      }
    }
    return items;
  }

  if (dimension === 'scheduleFeasibility') {
    const poisPerDay = new Map<number, number>();
    for (const poi of coverageMapData.pois) {
      poisPerDay.set(poi.day, (poisPerDay.get(poi.day) || 0) + 1);
    }
    const items: ScoreFinding[] = [];
    for (const [day, count] of poisPerDay) {
      if (count > 5) {
        items.push({
          id: `fallback-schedule-busy-${day}`,
          type: 'must',
          category: 'schedule',
          message:
            count > 7
              ? `第${day}天安排 ${count} 个景点，行程过满`
              : `第${day}天安排 ${count} 个景点，建议留出缓冲`,
          severity: count > 7 ? 'high' : 'medium',
          affectedDays: [day],
        });
      }
    }
    for (const segment of coverageMapData.segments) {
      if (segment.duration <= 180) continue;
      const from = coverageMapData.pois.find((p) => p.id === segment.fromPoiId);
      const to = coverageMapData.pois.find((p) => p.id === segment.toPoiId);
      if (!from || !to) continue;
      items.push({
        id: `fallback-schedule-drive-${segment.id}`,
        type: 'must',
        category: 'schedule',
        message: `第${segment.day}天 · ${from.name} → ${to.name} 驾车约 ${Math.round(segment.duration)} 分钟`,
        severity: segment.duration > 300 ? 'high' : 'medium',
        affectedDays: [segment.day],
      });
    }
    return items;
  }

  return [];
}
