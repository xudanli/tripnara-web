/**
 * Participant Portal adapter (Gate 1 backend)
 */

import { participantPortalApi } from '@/api/participant-portal';

export const GATE1_PARTICIPANT_SOURCE = 'gate1' as const;

export type ParticipantPortalSource = typeof GATE1_PARTICIPANT_SOURCE;

export const gate1ParticipantAdapter = {
  source: GATE1_PARTICIPANT_SOURCE,
  ...participantPortalApi,
};
