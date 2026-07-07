import { describe, expect, it } from 'vitest';
import {
  isCanonicalGatewayFlow,
  mapGatewayOptionsPayload,
  normalizeGatewayOptionsResponse,
  normalizeGatewayPreviewResponse,
  normalizeGatewayProblemDetail,
  shouldBlockLegacyDecisionCreate,
  unwrapUnifiedGatewayEnvelope,
} from '@/lib/unified-gateway-response.util';

/** GATE-008：Gateway options / preview 代理 */
describe('unified-gateway-response.util', () => {
  it('GATE-008 unwraps canonical options envelope', () => {
    const raw = {
      ok: true,
      flow: 'CANONICAL_L2',
      route: { resolution: 'PRIMARY', engineId: 'CANONICAL_DECISION_RUNTIME' },
      data: {
        options: [
          { id: 'cand_a', label: '绕行 A', candidateId: 'cand_a' },
          { id: 'cand_b', label: '绕行 B', candidateId: 'cand_b' },
        ],
      },
    };
    const result = normalizeGatewayOptionsResponse(raw);
    expect(result.flow).toBe('CANONICAL_L2');
    expect(result.route?.resolution).toBe('PRIMARY');
    expect(result.options).toHaveLength(2);
    expect(result.options[0].executionCapability).toBeUndefined();
  });

  it('GATE-008 maps canonical candidates array', () => {
    const options = mapGatewayOptionsPayload({
      candidates: [{ candidateId: 'cand_indoor', label: '室内替代' }],
    });
    expect(options[0].id).toBe('cand_indoor');
    expect(options[0].executionCapability).toBeUndefined();
  });

  it('preserves candidate executionCapability from BFF', () => {
    const options = mapGatewayOptionsPayload({
      candidates: [
        {
          candidateId: 'cand_split_day',
          label: '拆分超载日',
          executionCapability: 'GUIDED_MANUAL',
        },
      ],
    });
    expect(options[0].executionCapability).toBe('GUIDED_MANUAL');
  });

  it('preserves tradeoffs and routePreview on candidates after projection', () => {
    const options = mapGatewayOptionsPayload({
      candidates: [
        {
          candidateId: 'opt_a',
          title: '更换 Day 2 住宿',
          routePreview: { placeNames: ['A', 'B', 'C'] },
          tradeoffs: [
            { dimension: 'FLEXIBILITY', direction: 'IMPROVE', value: 32, unit: 'PERCENT' },
            { dimension: 'TIME', direction: 'IMPROVE', value: 198, unit: 'MINUTE' },
          ],
        },
      ],
    });
    expect(options[0].routePreview?.placeNames).toEqual(['A', 'B', 'C']);
    expect(options[0].tradeoffs?.[0]?.value).toBe(32);
  });

  it('GATE-008 unwraps canonical preview with GUIDED_MANUAL', () => {
    const raw = {
      ok: true,
      flow: 'CANONICAL_L2',
      route: { resolution: 'PRIMARY' },
      data: {
        optionId: 'cand_a',
        executionCapability: 'GUIDED_MANUAL',
        tradeoffs: [{ dimension: 'TIME', direction: 'WORSEN', explanation: '+30min' }],
      },
    };
    const preview = normalizeGatewayPreviewResponse(raw, 'cand_a');
    expect(preview.flow).toBe('CANONICAL_L2');
    expect(preview.executionCapability).toBe('GUIDED_MANUAL');
    expect(shouldBlockLegacyDecisionCreate({ flow: preview.flow })).toBe(true);
  });

  it('GATE-008 passes through legacy options without envelope', () => {
    const legacy = {
      options: [{ id: 'opt_1', label: 'Repair', executionCapability: 'DIRECT' }],
    };
    const result = normalizeGatewayOptionsResponse(legacy);
    expect(result.flow).toBeUndefined();
    expect(result.options[0].executionCapability).toBe('DIRECT');
  });

  it('detects gateway envelope shape', () => {
    const unwrapped = unwrapUnifiedGatewayEnvelope({
      ok: true,
      flow: 'LEGACY_V15',
      data: { options: [] },
    });
    expect(unwrapped.isGateway).toBe(true);
    expect(unwrapped.flow).toBe('LEGACY_V15');
    expect(isCanonicalGatewayFlow(unwrapped.flow)).toBe(false);
  });

  it('normalizes canonical problem detail envelope with negotiation projection', () => {
    const detail = normalizeGatewayProblemDetail(
      {
        ok: true,
        flow: 'CANONICAL_L2',
        route: { resolution: 'PRIMARY' },
        suggestedNegotiationDomain: 'main_transport',
        negotiation: {
          buttonLabel: '发起协商',
          status: 'none',
          taskId: 'nt:problem_load_1',
        },
        data: {
          problemId: 'problem_load_1',
          rfc001Problem: {
            semanticCapability: 'EXCESSIVE_DAILY_LOAD',
            status: 'OPEN',
          },
          candidates: [{ candidateId: 'cand_split_day', label: '拆分超载日' }],
        },
      },
      'problem_load_1',
    );
    expect(detail.flow).toBe('CANONICAL_L2');
    expect(detail.suggestedNegotiationDomain).toBe('main_transport');
    expect(detail.negotiation?.buttonLabel).toBe('发起协商');
    expect(detail.negotiation?.taskId).toBe('nt:problem_load_1');
  });
});
