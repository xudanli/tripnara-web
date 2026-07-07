import { describe, expect, it } from 'vitest';
import {
  mergeDecisionLedgerCausalityViews,
  parseDecisionLedgerCausality,
  parseLedgerHealingObservability,
  resolveDecisionIdForLedgerNode,
} from '@/lib/decision-ledger-causality.util';
import { extractDecisionLedgerCausalityFromRouteRun } from '@/lib/extract-decision-ledger-observability';

describe('decision-ledger-causality.util', () => {
  it('parses memory console causality links', () => {
    const view = parseDecisionLedgerCausality({
      revision: 'v1',
      trip_id: 'trip_abc',
      ledger_node_to_decision_id: { POI_REYNISFJARA: 'dec_123' },
      links: [
        {
          ledger_node_id: 'POI_REYNISFJARA',
          decision_id: 'dec_123',
          source: 'trip_metadata',
        },
      ],
      decision_records_count: 1,
    });
    expect(view?.ledgerNodeToDecisionId.POI_REYNISFJARA).toBe('dec_123');
    expect(resolveDecisionIdForLedgerNode(view, 'POI_REYNISFJARA')).toBe('dec_123');
  });

  it('parses ledger_healing user_decision_by_node_id', () => {
    const partial = parseLedgerHealingObservability({
      status: 'CONVERGED',
      affected_node_ids: ['POI_REYNISFJARA'],
      user_decision_by_node_id: { POI_REYNISFJARA: 'dec_1710000000_abc123' },
    });
    expect(partial?.healingStatus).toBe('CONVERGED');
    expect(partial?.ledgerNodeToDecisionId.POI_REYNISFJARA).toBe('dec_1710000000_abc123');
  });

  it('merges causality and healing views', () => {
    const merged = mergeDecisionLedgerCausalityViews(
      parseDecisionLedgerCausality({
        links: [{ ledger_node_id: 'A', decision_id: 'dec_a' }],
      }),
      {
        ledgerNodeToDecisionId: { B: 'dec_b' },
        links: [{ ledgerNodeId: 'B', decisionId: 'dec_b' }],
        source: 'route_and_run',
      },
    );
    expect(merged?.links).toHaveLength(2);
    expect(merged?.source).toBe('merged');
  });
});

describe('extractDecisionLedgerCausabilityFromRouteRun', () => {
  it('reads observability.ledger_healing and memory_contract causality', () => {
    const view = extractDecisionLedgerCausalityFromRouteRun({
      observability: {
        ledger_healing: {
          status: 'CONVERGED',
          affected_node_ids: ['POI_REYNISFJARA'],
          user_decision_by_node_id: { POI_REYNISFJARA: 'dec_abc' },
        },
        memory_contract: {
          revision: 'v1',
          loaded: true,
          layers: [],
          decision_ledger_causality: {
            links: [{ ledger_node_id: 'POI_REYNISFJARA', decision_id: 'dec_abc' }],
          },
        },
      },
    } as import('@/api/agent').RouteAndRunResponse);
    expect(view?.ledgerNodeToDecisionId.POI_REYNISFJARA).toBe('dec_abc');
    expect(view?.healingStatus).toBe('CONVERGED');
  });
});
