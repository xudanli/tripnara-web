import apiClient from '@/api/client';
import type {
  SubmitGuardianChooseRequest,
  SubmitGuardianChooseResponse,
} from '@/types/guardian-choose';

const API_BASE = '/v2/trips';

export const guardianChooseApi = {
  /**
   * 专用 CHOOSE 写回（P1）。
   * 409 → 硬约束 BLOCKED，不可覆盖 Abu 判定。
   */
  async submitChoose(
    tripId: string,
    body: SubmitGuardianChooseRequest,
  ): Promise<SubmitGuardianChooseResponse> {
    const { data } = await apiClient.post<SubmitGuardianChooseResponse>(
      `${API_BASE}/${tripId}/guardian/choose`,
      body,
    );
    return data;
  },
};
