import type {
  TravelContextIntentRequest,
  TravelContextIntentResult,
  TravelContextProvider,
} from '../client/travel-context-api.types';

function isRevisionConflict(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'REVISION_CONFLICT';
}

export { isRevisionConflict };

/** 409 REVISION_CONFLICT → refresh 后重试一次 */
export async function submitIntentWithRetry(
  provider: TravelContextProvider,
  intent: Omit<TravelContextIntentRequest, 'basedOnRevision'>,
): Promise<TravelContextIntentResult> {
  try {
    return await provider.submitIntent({
      ...intent,
      basedOnRevision: provider.getState().revision,
    });
  } catch (err) {
    if (!isRevisionConflict(err)) throw err;
    await provider.refresh();
    return provider.submitIntent({
      ...intent,
      basedOnRevision: provider.getState().revision,
    });
  }
}
