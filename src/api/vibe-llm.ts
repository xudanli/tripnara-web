import apiClient from '@/api/client';
import {
  getVibeLlmApiMode,
  withVibeLlmFallback,
} from '@/features/match-square/lib/match-square-api-mode';
import {
  buildVibeLlmParseResponse,
  normalizeVibeLlmParseResponse,
} from '@/features/match-square/lib/vibe-llm/normalize-api';
import type { VibeLlmParseRequest, VibeLlmParseResponse } from '@/types/vibe-llm';

const BASE_PATH = '/match-square/vibe-llm';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

function unwrap<T>(payload: SuccessResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as SuccessResponse<T>).data;
  }
  return payload as T;
}

function toRequestBody(req: VibeLlmParseRequest): Record<string, unknown> {
  const freeText = req.freeText ?? req.text ?? '';
  return {
    freeText,
    free_text: freeText,
    slotsNeeded: req.slotsNeeded,
    slots_needed: req.slotsNeeded,
    captainContext: req.captainContext,
    captain_context: req.captainContext
      ? {
          mbti_type: req.captainContext.mbtiType,
          persona_title: req.captainContext.personaTitle,
          ...req.captainContext,
        }
      : undefined,
  };
}

async function parseLive(payload: VibeLlmParseRequest): Promise<VibeLlmParseResponse> {
  const response = await apiClient.post<SuccessResponse<unknown>>(
    `${BASE_PATH}/parse`,
    toRequestBody(payload)
  );
  const normalized = normalizeVibeLlmParseResponse(unwrap(response.data));
  if (getVibeLlmApiMode() === 'live' && normalized.parseSource !== 'llm') {
    return { ...normalized, parseSource: 'llm', source: 'live_llm' };
  }
  return normalized;
}

export const vibeLlmApi = {
  /** POST /api/match-square/vibe-llm/parse — vibe 标签以接口 payload.vibe_chips 为准 */
  parse: (payload: VibeLlmParseRequest): Promise<VibeLlmParseResponse> =>
    withVibeLlmFallback(
      () => parseLive(payload),
      () => buildVibeLlmParseResponse(payload)
    ),
};
