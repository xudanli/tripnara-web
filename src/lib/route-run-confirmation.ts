import type { RouteAndRunResponse } from '@/api/agent';
import { extractApprovalId, needsApproval } from '@/utils/approval';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';

export interface RouteRunConfirmationState {
  approvalId: string;
  summary?: string;
  skillName?: string;
}

export function pickRouteRunConfirmationFromResponse(
  response: RouteAndRunResponse,
): RouteRunConfirmationState | null {
  if (!needsApproval(response)) return null;
  const approvalId = extractApprovalId(response);
  if (!approvalId) return null;
  const suspension = response.result.payload?.suspensionInfo;
  return {
    approvalId,
    summary: typeof suspension?.summary === 'string' ? suspension.summary.trim() : undefined,
    skillName: typeof suspension?.skillName === 'string' ? suspension.skillName.trim() : undefined,
  };
}

export function applyRouteRunConfirmationToStore(response: RouteAndRunResponse): void {
  const confirmation = pickRouteRunConfirmationFromResponse(response);
  useWorldModelGuardsStore.getState().setRouteRunConfirmation(confirmation);
}

export function clearRouteRunConfirmationFromStore(): void {
  useWorldModelGuardsStore.getState().setRouteRunConfirmation(null);
}
