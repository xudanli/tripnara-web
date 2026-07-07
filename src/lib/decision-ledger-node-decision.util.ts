import { decisionProblemsApi } from '@/api/decision-problems';
import {
  resolveDecisionIdForLedgerNode,
  type DecisionLedgerCausalityView,
} from '@/lib/decision-ledger-causality.util';

/**
 * Ledger 节点 → 用户决策 ID
 * 优先 BFF `GET decision-ledger/nodes/:id/decision`，失败时回退 causality 本地表
 */
export async function resolveLedgerNodeDecisionId(
  tripId: string,
  ledgerNodeId: string,
  causality?: DecisionLedgerCausalityView | null,
): Promise<string | null> {
  if (!tripId?.trim() || !ledgerNodeId?.trim()) return null;

  try {
    const res = await decisionProblemsApi.getDecisionByLedgerNode(tripId, ledgerNodeId);
    if (res.decisionId?.trim()) return res.decisionId.trim();
  } catch (err) {
    if (!decisionProblemsApi.isNotImplemented(err)) {
      const local = resolveDecisionIdForLedgerNode(causality, ledgerNodeId);
      if (local) return local;
    }
  }

  return resolveDecisionIdForLedgerNode(causality, ledgerNodeId) ?? null;
}
