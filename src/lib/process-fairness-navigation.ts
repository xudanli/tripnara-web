import type { NavigateFunction } from 'react-router-dom';
import type { RouteAndRunResponse } from '@/api/agent';
import { pickProcessFairnessFromPayload } from '@/lib/normalize-process-fairness';
import { truncateAnswerTextForBubble } from '@/lib/route-run-render-policy';
import type { ProcessFairnessPayload } from '@/types/process-fairness';

/** 成功触发结构化协商：triggered 或 SCAFFOLD（单人讨论框架） */
export function isProcessFairnessActivated(
  pf: ProcessFairnessPayload | null | undefined,
): boolean {
  if (!pf) return false;
  return pf.triggered === true || pf.status === 'SCAFFOLD';
}

export function shouldApplyProcessFairnessFromRouteRun(response: RouteAndRunResponse): boolean {
  if (response.result?.status !== 'OK') return false;
  return isProcessFairnessActivated(pickProcessFairnessFromRouteRun(response));
}

export function pickProcessFairnessFromRouteRun(
  response: RouteAndRunResponse,
): ProcessFairnessPayload | null {
  const payload = response.result?.payload;
  if (!payload || typeof payload !== 'object') return null;
  return pickProcessFairnessFromPayload(payload as Record<string, unknown>);
}

export function buildStructuredNegotiationUrl(payload: ProcessFairnessPayload): string | null {
  const nav = payload.clientNavigation;
  const tripId = nav?.tripId ?? payload.round?.tripId;
  const roundId = nav?.roundId ?? payload.roundId;
  if (!tripId || !roundId) return null;

  const params = new URLSearchParams({
    tripId,
    roundId,
  });
  if (nav?.domain) params.set('roundDomain', nav.domain);
  return `/dashboard/plan-studio?${params.toString()}`;
}

/** Agent 触发结构化协商：更新 URL + 打开弹窗（不强制切团队 Tab） */
export function navigateToStructuredNegotiation(
  navigate: NavigateFunction,
  payload: ProcessFairnessPayload,
): boolean {
  const url = buildStructuredNegotiationUrl(payload);
  if (!url) return false;

  navigate(url);

  const roundId = payload.clientNavigation?.roundId ?? payload.roundId;
  const tripId = payload.clientNavigation?.tripId ?? payload.round?.tripId;
  if (typeof window !== 'undefined' && tripId) {
    window.dispatchEvent(
      new CustomEvent('plan-studio:open-structured-negotiation', {
        detail: {
          tripId,
          roundId,
          domain: payload.clientNavigation?.domain,
        },
      }),
    );
  }

  if (roundId && tripId && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('plan-studio:select-preference-round', {
        detail: { tripId, roundId, domain: payload.clientNavigation?.domain },
      }),
    );
  }

  return true;
}

export function applyProcessFairnessFromRouteRun(
  response: RouteAndRunResponse,
  navigate: NavigateFunction,
): ProcessFairnessPayload | null {
  const pf = pickProcessFairnessFromRouteRun(response);
  if (!shouldApplyProcessFairnessFromRouteRun(response) || !pf) return null;
  navigateToStructuredNegotiation(navigate, pf);
  return pf;
}

/** Plan Studio 助手气泡：协商卡片为主 UI，answer_text 压成副标题 */
export function demoteRouteRunAnswerForProcessFairnessBubble(options: {
  messageContent: string;
  messageContentHtml?: string;
}): { content: string; contentHtml?: string; suppressAnswerProse: true } {
  const raw = options.messageContent.trim();
  return {
    content: raw ? truncateAnswerTextForBubble(raw) : '',
    contentHtml: undefined,
    suppressAnswerProse: true,
  };
}
