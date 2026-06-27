import { describe, expect, it } from 'vitest';
import { pickLegEvidenceBundleFromRouteRun } from '@/lib/leg-evidence-ui';
import { pickPoiPitfallBundleFromRouteRun } from '@/lib/poi-pitfall-ui';
import type { RouteAndRunResponse } from '@/api/agent';

function okResponse(uiDisplay: Record<string, unknown>): RouteAndRunResponse {
  return {
    request_id: 'req-1',
    result: {
      status: 'OK',
      payload: {
        ui_display: uiDisplay,
      },
    },
  } as RouteAndRunResponse;
}

describe('physical evidence bundle headlines', () => {
  it('extracts leg evidence headline_zh from payload wrapper', () => {
    const bundle = pickLegEvidenceBundleFromRouteRun(
      okResponse({
        leg_evidence_cards: {
          schema: 'tripnara.leg_evidence_cards@v1',
          headline_zh: '冰岛路段风险提示',
          cards: [{ summary_zh: '步行 · 2.1km · 约 26 分钟' }],
        },
      }),
    );
    expect(bundle.headlineZh).toBe('冰岛路段风险提示');
    expect(bundle.cards).toHaveLength(1);
  });

  it('extracts poi pitfall headline_zh from payload wrapper', () => {
    const bundle = pickPoiPitfallBundleFromRouteRun(
      okResponse({
        poi_pitfall_cards: {
          schema: 'tripnara.poi_pitfall_cards@v1',
          headline_zh: '热门 POI 避坑',
          cards: [{ summary_zh: '蓝湖需预约', poi_name_zh: '蓝湖' }],
        },
      }),
    );
    expect(bundle.headlineZh).toBe('热门 POI 避坑');
    expect(bundle.cards).toHaveLength(1);
  });
});
