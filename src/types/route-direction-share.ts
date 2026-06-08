import type { SharePermission } from '@/types/trip';
import type { RouteDirection } from '@/types/places-routes';

export interface CreateRouteDirectionShareRequest {
  permission?: SharePermission;
  expiresAt?: string;
}

export interface RouteDirectionShare {
  id: string;
  routeDirectionId: number;
  shareToken: string;
  permission: SharePermission;
  expiresAt: string | null;
  /** 相对路径，如 `/trails/shared/{token}` */
  shareUrl: string;
  createdAt: string;
}

export interface SharedRouteDirectionResponse {
  routeDirection: RouteDirection;
  permission: SharePermission;
  shareToken: string;
  expiresAt?: string | null;
}
