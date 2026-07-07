import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { resolveLedgerNodeDecisionId } from '@/lib/decision-ledger-node-decision.util';
import { buildPlanStudioDecisionRecordPath } from '@/lib/plan-studio-decision-navigation.util';
import type { DecisionLedgerCausalityView } from '@/lib/decision-ledger-causality.util';

export function useOpenDecisionRecordNavigation(tripId: string | null | undefined) {
  const navigate = useNavigate();

  const openByDecisionId = useCallback(
    (decisionId: string) => {
      const tid = tripId?.trim();
      if (!tid || !decisionId?.trim()) {
        toast.error('无法打开决策记录');
        return;
      }
      navigate(buildPlanStudioDecisionRecordPath(tid, decisionId.trim()));
    },
    [tripId, navigate],
  );

  const openByLedgerNode = useCallback(
    async (
      ledgerNodeId: string,
      causality?: DecisionLedgerCausalityView | null,
      knownDecisionId?: string,
    ) => {
      const tid = tripId?.trim();
      if (!tid) {
        toast.error('请先选择行程');
        return;
      }
      const decisionId =
        knownDecisionId?.trim() ??
        (await resolveLedgerNodeDecisionId(tid, ledgerNodeId, causality));
      if (!decisionId) {
        toast.error('未找到该 Ledger 节点关联的决策');
        return;
      }
      navigate(buildPlanStudioDecisionRecordPath(tid, decisionId));
    },
    [tripId, navigate],
  );

  return { openByDecisionId, openByLedgerNode };
}
