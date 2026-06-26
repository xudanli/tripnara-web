import type { QueryClient } from '@tanstack/react-query';
import { projectFitApi } from '@/api/project-fit';
import { projectFitApplicationQueryKey } from '@/hooks/useProjectFit';
import type { ParticipantPortalLink } from '@/types/participant-portal';
import type { ProjectFitApplication } from '@/types/project-fit';

const POLL_INTERVAL_MS = 800;
const MAX_POLL_ATTEMPTS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Project Fit 确认加入后，轮询直到 participantPortal 就绪 */
export async function pollProjectFitParticipantPortal(
  applicationId: string,
  queryClient: QueryClient,
  initial?: ProjectFitApplication | null,
): Promise<ParticipantPortalLink | null> {
  let latest = initial;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (latest?.participantPortal?.portalPath) {
      return latest.participantPortal;
    }
    if (attempt > 0) {
      await sleep(POLL_INTERVAL_MS);
    }
    latest = await queryClient.fetchQuery({
      queryKey: projectFitApplicationQueryKey(applicationId),
      queryFn: () => projectFitApi.getApplication(applicationId),
    });
  }

  return latest?.participantPortal?.portalPath ? latest.participantPortal : null;
}
