/**
 * route_and_run：result.payload.ui_display.delivery_artifacts 默认交付条
 */

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/api/client';
import { tripReviewApi } from '@/api/trip-review';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DeliveryArtifactLink, DeliveryArtifactsPayload } from '@/types/delivery-artifacts';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';
import {
  Calendar,
  Copy,
  ExternalLink,
  FileDown,
  LayoutDashboard,
  MapPin,
} from 'lucide-react';

export interface DeliveryArtifactsBarProps {
  artifacts: DeliveryArtifactsPayload;
  /** 当前会话绑定的 tripId，用于 dashboard / PDF 等兜底 */
  tripId?: string | null;
  disabled?: boolean;
  className?: string;
}

function iconForKind(kind: DeliveryArtifactLink['kind']) {
  switch (kind) {
    case 'map':
      return MapPin;
    case 'calendar':
      return Calendar;
    case 'dashboard':
      return LayoutDashboard;
    case 'pdf':
      return FileDown;
    case 'text_copy':
      return Copy;
    default:
      return ExternalLink;
  }
}

async function invokeApiAction(action: NonNullable<DeliveryArtifactLink['api_action']>): Promise<void> {
  const method = (action.method ?? 'POST').toUpperCase();
  const path = action.path.startsWith('/') ? action.path : `/${action.path}`;
  if (method === 'GET') {
    await apiClient.get(path);
    return;
  }
  if (method === 'POST') {
    await apiClient.post(path, action.body ?? {});
    return;
  }
  if (method === 'PUT') {
    await apiClient.put(path, action.body ?? {});
    return;
  }
  if (method === 'PATCH') {
    await apiClient.patch(path, action.body ?? {});
    return;
  }
  if (method === 'DELETE') {
    await apiClient.delete(path);
    return;
  }
  throw new Error(`不支持的 API 方法：${method}`);
}

export function DeliveryArtifactsBar({
  artifacts,
  tripId,
  disabled,
  className,
}: DeliveryArtifactsBarProps) {
  const navigate = useNavigate();
  const links = artifacts.links ?? [];
  if (!links.length) return null;

  const sanitizedTripId = tripId ? sanitizeRouteRunTripId(tripId) : undefined;

  return (
    <div className={cn('mt-3 rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5', className)}>
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {artifacts.headline_zh?.trim() || '行程交付'}
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link, idx) => {
          const Icon = iconForKind(link.kind);
          const key = `${link.kind}-${link.label_zh}-${idx}`;

          return (
            <Button
              key={key}
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              className="h-8 rounded-full text-xs gap-1.5"
              onClick={async () => {
                try {
                  if (link.kind === 'map') {
                    if (!link.href) {
                      toast.error('地图链接缺失');
                      return;
                    }
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                    return;
                  }

                  if (link.kind === 'calendar') {
                    if (link.api_action?.path) {
                      await invokeApiAction(link.api_action);
                      toast.success('已提交日历同步');
                      return;
                    }
                    if (link.href) {
                      window.open(link.href, '_blank', 'noopener,noreferrer');
                      return;
                    }
                    toast.error('日历同步入口缺失');
                    return;
                  }

                  if (link.kind === 'dashboard') {
                    if (link.href) {
                      navigate(link.href);
                      return;
                    }
                    if (sanitizedTripId) {
                      navigate(`/dashboard/trips/${sanitizedTripId}`);
                      return;
                    }
                    toast.error('需要有效行程 ID 才能打开工作台');
                    return;
                  }

                  if (link.kind === 'pdf') {
                    if (sanitizedTripId) {
                      const blob = await tripReviewApi.exportReview(sanitizedTripId, 'pdf');
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `trip-${sanitizedTripId}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('PDF 已开始下载');
                      return;
                    }
                    if (link.href) {
                      window.open(link.href, '_blank', 'noopener,noreferrer');
                      return;
                    }
                    toast.error('需要有效行程 ID 才能导出 PDF');
                    return;
                  }

                  if (link.kind === 'text_copy') {
                    const text = link.text_content?.trim();
                    if (!text) {
                      toast.error('暂无可复制文本');
                      return;
                    }
                    await navigator.clipboard.writeText(text);
                    toast.success('已复制到剪贴板');
                    return;
                  }

                  if (link.href) {
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  if (link.api_action?.path) {
                    await invokeApiAction(link.api_action);
                    toast.success('操作已提交');
                    return;
                  }
                  toast.error('该交付入口暂不可用');
                } catch (err) {
                  const msg = err instanceof Error ? err.message : '操作失败';
                  toast.error(msg);
                }
              }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {link.label_zh}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
