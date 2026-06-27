import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteAndRunResponse } from '@/api/agent';
import { handleRouteAndRunResponse } from '@/lib/handleRouteAndRunResponse';
import { pickDecisionCockpitFromRouteRun, pickDecisionCockpitStripSummary } from '@/lib/decision-cockpit';
import { pickRouteRunConfirmationFromResponse } from '@/lib/route-run-confirmation';
import { pickRouteRunNegotiationFromResponse } from '@/lib/route-run-negotiation';
import {
  resolveDecisionStripPersonaLine,
  resolveDecisionStripPrimaryCta,
} from '@/lib/decision-strip-model';
import {
  applyRouteAndRunToStore,
  buildLockedItineraryItemIdSet,
  resetWorldModelGuardsStore,
} from '@/lib/world-model-guards';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

function buildCausalOkResponse(): RouteAndRunResponse {
  return {
    request_id: 'req-causal-smoke-1',
    result: {
      status: 'OK',
      answer_text: '已生成冰岛行程草案',
      payload: {
        orchestrationResult: {
          itinerary: {
            days: [
              {
                items: [{ id: 'item-a' }, { id: 'item-b', metadata: { leg_id: 'leg-1' } }],
              },
            ],
          },
        },
        ui_display: {
          leg_evidence_cards: {
            headline_zh: '路段物理证据',
            cards: [{ summary_zh: '步行 2km' }],
          },
          poi_pitfall_cards: {
            headline_zh: 'POI 避坑',
            cards: [{ summary_zh: '需预约', poi_name_zh: '蓝湖' }],
          },
        },
      },
    },
    explain: {
      world_model_guards: {
        segment_editor_mode: 'slot_timing_only',
        is_route_topology_locked: true,
        locked_segment_ids: ['leg:item-a:item-b'],
        banner_message_zh: '路线骨架已锁定，仅可调整时间',
      },
      decision_cockpit: {
        integrity_badges: [
          {
            key: 'physical_evidence',
            status: 'warn',
            label_zh: '物理证据',
            summary_zh: '第 2 天缺少坡度核验',
          },
        ],
        decision_trace_rows: [
          {
            persona: 'ABU',
            summary_zh: '安全门控通过',
            verdict: 'ALLOW',
          },
        ],
      },
      optimization: {
        score: 0.82,
        method: 'hybrid',
      },
      cascade_ui_hints: [
        {
          hint_id: 'cascade-1',
          message: '调整 Day 2 会影响 Day 3 转场',
        },
      ],
    },
  } as RouteAndRunResponse;
}

describe('world model causal integration smoke', () => {
  beforeEach(() => {
    resetWorldModelGuardsStore();
  });

  it('projects OK route_and_run into guards store across all causal layers', () => {
    applyRouteAndRunToStore(buildCausalOkResponse(), 'trip-smoke-1');

    const state = useWorldModelGuardsStore.getState();
    expect(state.worldModelGuards?.segment_editor_mode).toBe('slot_timing_only');
    expect(state.isRouteTopologyLocked).toBe(true);
    expect(state.lockedSegmentIds.has('leg:item-a:item-b')).toBe(true);
    expect(state.legEvidenceCards).toHaveLength(1);
    expect(state.legEvidenceHeadlineZh).toBe('路段物理证据');
    expect(state.poiPitfallCards).toHaveLength(1);
    expect(state.cascadeUiHints).toHaveLength(1);
    expect(state.decisionCockpit?.integrity_badges?.[0]?.summary_zh).toContain('坡度');
    expect(state.optimizationMethod).toBe('hybrid');
    expect(state.lastRequestId).toBe('req-causal-smoke-1');
  });

  it('maps locked segments to itinerary items for schedule editing', () => {
    applyRouteAndRunToStore(buildCausalOkResponse(), 'trip-smoke-1');
    const locked = useWorldModelGuardsStore.getState().lockedSegmentIds;
    const lockedItems = buildLockedItineraryItemIdSet(locked, [
      { id: 'item-a' },
      { id: 'item-b' },
    ]);
    expect(lockedItems.has('item-a')).toBe(true);
    expect(lockedItems.has('item-b')).toBe(true);
  });

  it('routes negotiation and confirmation through handleRouteAndRunResponse', () => {
    const negotiationBody = {
      request_id: 'req-neg-1',
      result: {
        status: 'OK',
        payload: {
          negotiation_payload: {
            status: 'PENDING_USER_DECISION',
            impact: 'Day 2 需改线',
            reason: '高铁窗口冲突',
            alternatives: [],
            default_option_id: 'alt-a',
            negotiation_session_id: 'neg-1',
            expected_negotiation_hash: 'hash-1',
            recommendation_summary: '建议改乘飞机',
          },
        },
      },
    } as RouteAndRunResponse;

    let settled: RouteAndRunResponse | null = null;
    handleRouteAndRunResponse(negotiationBody, {
      onAsyncStart: vi.fn(),
      onClarification: vi.fn(),
      onSuccess: (body) => {
        settled = body;
      },
      onFailed: vi.fn(),
    });

    expect(settled?.request_id).toBe('req-neg-1');
    expect(pickRouteRunNegotiationFromResponse(negotiationBody)?.payload.impact).toBe('Day 2 需改线');
    expect(
      resolveDecisionStripPrimaryCta({
        guards: null,
        compareSummary: null,
        hasBlockGuard: false,
        needNegotiation: { negotiationSessionId: 'neg-1' },
      }).type,
    ).toBe('open_negotiation');

    resetWorldModelGuardsStore();

    const confirmationBody = {
      request_id: 'req-conf-1',
      result: {
        status: 'NEED_CONFIRMATION',
        payload: {
          suspensionInfo: {
            approvalId: 'appr-1',
            summary: '将修改 Day 2 路线',
          },
        },
      },
    } as RouteAndRunResponse;

    handleRouteAndRunResponse(confirmationBody, {
      onAsyncStart: vi.fn(),
      onClarification: vi.fn(),
      onSuccess: vi.fn(),
      onFailed: vi.fn(),
    });

    expect(pickRouteRunConfirmationFromResponse(confirmationBody)?.approvalId).toBe('appr-1');
    expect(useWorldModelGuardsStore.getState().routeRunConfirmation?.approvalId).toBe('appr-1');
  });

  it('aligns strip persona single_lead and cockpit summary projections', () => {
    const persona = resolveDecisionStripPersonaLine([
      {
        id: 'alert-1',
        persona: 'ABU',
        title: 'ignored',
        explanation: '第 3 天不宜自驾。',
        severity: 'warning',
        createdAt: '2026-01-01T00:00:00Z',
        presentation: {
          mode: 'single_lead',
          headline: '当前方案被安全门控拦截',
          narrative: '第 3 天不宜自驾。',
          leadSpeaker: 'ABU',
        },
        metadata: { audience: 'user' },
      },
    ]);
    expect(persona.mode).toBe('single_lead');
    expect(persona.leadHeadline).toBe('当前方案被安全门控拦截');

    const cockpitSummary = pickDecisionCockpitStripSummary(
      pickDecisionCockpitFromRouteRun(buildCausalOkResponse()),
    );
    expect(cockpitSummary?.headline).toContain('坡度核验');
  });
});
