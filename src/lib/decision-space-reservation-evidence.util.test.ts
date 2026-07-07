import { describe, expect, it } from 'vitest';
import {
  isReservationEvidenceUploadAction,
  shouldShowDecisionSpaceReservationEvidence,
} from './decision-space-reservation-evidence.util';
import type { DecisionAction } from '@/types/unified-decision';

describe('decision-space-reservation-evidence.util', () => {
  it('detects upload evidence actions', () => {
    expect(
      isReservationEvidenceUploadAction({
        actionId: 'upload_credentials',
        label: '上传凭证',
        allowed: true,
      }),
    ).toBe(true);
    expect(
      isReservationEvidenceUploadAction({
        actionId: 'BOOK_NOW',
        label: '立即预订',
        allowed: true,
      }),
    ).toBe(false);
  });

  it('shows evidence panel for reservation template without selection', () => {
    expect(
      shouldShowDecisionSpaceReservationEvidence({
        templateSupports: true,
        selectedAction: null,
      }),
    ).toBe(true);
  });

  it('hides evidence panel when book-now selected', () => {
    const action: DecisionAction = {
      actionId: 'BOOK_NOW',
      label: '立即预订',
      allowed: true,
    };
    expect(
      shouldShowDecisionSpaceReservationEvidence({
        templateSupports: true,
        selectedAction: action,
      }),
    ).toBe(false);
  });
});
