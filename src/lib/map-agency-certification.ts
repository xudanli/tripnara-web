import type { SubmitAgencyCertificationPayload } from '@/types/agency-certification';
import type { AgencyCertificationDraftBody } from '@/types/identity-governance';

/** 前端多步表单 → POST .../certification/draft */
export function mapAgencyPayloadToDraftBody(
  payload: SubmitAgencyCertificationPayload
): AgencyCertificationDraftBody {
  return {
    workspaceName: payload.workspaceName,
    entity: payload.entity,
    authorization: payload.authorization,
    operations: payload.operations,
    financial: payload.financial,
  };
}
