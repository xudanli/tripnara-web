import type { ArrangeItineraryProposalWriteResponse } from '@/types/arrange-itinerary';

export function extractProposalFromWriteResult(
  result: unknown,
): ArrangeItineraryProposalWriteResponse | null {
  if (
    result != null &&
    typeof result === 'object' &&
    (result as ArrangeItineraryProposalWriteResponse).mode === 'proposal'
  ) {
    return result as ArrangeItineraryProposalWriteResponse;
  }
  return null;
}
