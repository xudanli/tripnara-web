import { matchSquareMockStore } from '../mock-store';
import { MatchSquareApiError } from '@/api/match-square';
import type { SovereignForceLockCommitResult, SovereignForceLockRequest } from '@/types/sovereign-force-lock';
import { buildForceLockPreviewFromPost } from './build-force-lock-preview-from-post';

export async function mockCommitForceLock(
  postId: string,
  body: SovereignForceLockRequest = {}
): Promise<SovereignForceLockCommitResult> {
  const post = await matchSquareMockStore.getPost(postId);
  if (!post) throw new MatchSquareApiError('NOT_FOUND', '招募帖不存在');

  const preview = buildForceLockPreviewFromPost(post);
  if (!preview.canForceLock) {
    throw new MatchSquareApiError('FORCE_LOCK_BLOCKED', preview.blockReason ?? '当前不可锁团');
  }

  const { slotsFilled, slotsNeeded } = post.teamStatus;
  const sovereignLock = {
    originalSlotsNeeded: slotsNeeded,
    effectiveSlotsNeeded: slotsFilled,
    droppedOpenSlots: preview.droppedOpenSlots,
    physicalDeficits: preview.physicalDeficits,
    vaultRecalc: preview.vaultRecalc,
    resilienceScore: preview.resilienceScore,
    pendingApplicationsRejected: preview.pendingApplicationsToReject,
    taskRebalanceNote: '公摊物资任务将按缩编后人数重派',
    lockedAt: new Date().toISOString(),
    note: body.note ?? null,
  };

  await matchSquareMockStore.updatePostStatus(postId, 'closed');

  const updated = await matchSquareMockStore.getPost(postId);
  if (updated) {
    Object.assign(updated, {
      sovereignLock,
      teamStatus: {
        slotsFilled,
        slotsNeeded: slotsFilled,
        slotsRemaining: 0,
      },
    });
  }

  let instantiation = null;
  let activeTripPath = null;
  if (body.skipInstantiate !== true && updated) {
    instantiation = await matchSquareMockStore.instantiateTrip(postId, { skipIfExists: true });
    activeTripPath = instantiation.activeTripPath ?? null;
  }

  return {
    postId,
    sovereignLock,
    rejectedApplicationIds: [],
    instantiation,
    activeTripPath,
    dnaScheduled: true,
  };
}
