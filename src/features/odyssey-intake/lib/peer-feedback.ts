import { odysseyIntakeApi } from '@/api/odyssey-intake';
import type { OdysseyPeerFeedbackRequest } from '@/types/odyssey-intake';

/** 行程结束页埋点：行后互评 → 画像修正 */
export async function submitOdysseyPeerFeedback(payload: OdysseyPeerFeedbackRequest): Promise<void> {
  await odysseyIntakeApi.submitPeerFeedback(payload);
}
