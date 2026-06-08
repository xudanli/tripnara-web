import type { SubmitApplicationRequest } from '@/types/match-square';

function setAcceptedFlag(
  body: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
  value: boolean
): void {
  body[camelKey] = value;
  body[snakeKey] = value;
}

/** POST /match-square/posts/:id/applications — 与 CreateRecruitmentApplicationDto 对齐 */
export function serializeSubmitApplicationRequest(
  payload: SubmitApplicationRequest
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    message: payload.message,
  };

  if (payload.planningCommitmentAccepted != null) {
    setAcceptedFlag(
      body,
      'planningCommitmentAccepted',
      'planning_commitment_accepted',
      payload.planningCommitmentAccepted
    );
  }
  if (payload.teamworkCommitmentAccepted != null) {
    setAcceptedFlag(
      body,
      'teamworkCommitmentAccepted',
      'teamwork_commitment_accepted',
      payload.teamworkCommitmentAccepted
    );
  }
  if (payload.vibeContractsAccepted != null) {
    setAcceptedFlag(
      body,
      'vibeContractsAccepted',
      'vibe_contracts_accepted',
      payload.vibeContractsAccepted
    );
  }
  if (payload.routeContractAccepted != null) {
    setAcceptedFlag(
      body,
      'routeContractAccepted',
      'route_contract_accepted',
      payload.routeContractAccepted
    );
  }
  if (payload.targetSlotIndex != null) {
    body.targetSlotIndex = payload.targetSlotIndex;
    body.target_slot_index = payload.targetSlotIndex;
  }
  if (payload.targetSlotId) {
    body.targetSlotId = payload.targetSlotId;
    body.target_slot_id = payload.targetSlotId;
  }
  if (payload.targetSlotLabel) {
    body.targetSlotLabel = payload.targetSlotLabel;
    body.target_slot_label = payload.targetSlotLabel;
  }
  if (payload.physicalSurvivalQuizAnswers) {
    body.physicalSurvivalQuizAnswers = payload.physicalSurvivalQuizAnswers;
    body.physical_survival_quiz_answers = payload.physicalSurvivalQuizAnswers;
  }

  return body;
}
