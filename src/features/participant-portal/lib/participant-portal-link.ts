import type { ParticipantPortalLink } from '@/types/participant-portal';

/** 将 API 返回的 portalPath 规范化为站内路由 */
export function normalizeParticipantPortalHref(portalPath: string): string {
  if (portalPath.startsWith('http')) {
    try {
      return new URL(portalPath).pathname;
    } catch {
      return portalPath;
    }
  }
  return portalPath.startsWith('/') ? portalPath : `/${portalPath}`;
}

export function participantPortalHrefFromToken(token: string): string {
  return `/participant/projects/${encodeURIComponent(token)}/dashboard`;
}

export function participantPortalHrefFromLink(link: ParticipantPortalLink): string {
  return normalizeParticipantPortalHref(link.portalPath);
}
