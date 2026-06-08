/**
 * route_and_run：result.payload.suggested_operations 快捷操作（再对话 / 纯导航）
 */

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { SuggestedOperation } from '@/api/agent';
import {
  parseIntentModeFromSuggestedPayload,
  pathForSuggestedClientNavigation,
  type RouteRunIntentModeOption,
} from '@/lib/suggested-operations';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';
import { cn } from '@/lib/utils';
import { Zap, ExternalLink } from 'lucide-react';

export interface SuggestedOperationsBarProps {
  operations: SuggestedOperation[];
  /**
   * kind=route_and_run_message：下发 message + 可选 payload.trip_id；
   * 若 payload 含 `intent_mode`，第三参须写入下一轮 `options.intent_mode`。
   */
  onRouteRunMessage: (message: string, tripIdOverride?: string, intentModeFromSuggestedPayload?: RouteRunIntentModeOption) => void;
  disabled?: boolean;
  /** 埋点/禁用：当前正在执行的 operation id */
  activeOperationId?: string | null;
  className?: string;
}

export function SuggestedOperationsBar({
  operations,
  onRouteRunMessage,
  disabled,
  activeOperationId,
  className,
}: SuggestedOperationsBarProps) {
  const navigate = useNavigate();

  if (!operations.length) return null;

  return (
    <div className={cn('mt-3 flex flex-wrap gap-2', className)}>
      <div className="w-full text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        快捷操作
      </div>
      <div className="flex flex-wrap gap-2">
        {operations.map((op) => {
          const busy = disabled || activeOperationId === op.id;
          const isNav = op.kind === 'client_navigation';
          const isMsg = op.kind === 'route_and_run_message';

          return (
            <Button
              key={op.id}
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              className={cn(
                'h-8 rounded-full text-xs gap-1.5 max-w-full',
                isNav && 'border border-border/80 bg-muted/40'
              )}
              title={op.id}
              onClick={() => {
                if (isMsg) {
                  const msg =
                    typeof op.payload?.message === 'string' ? op.payload.message.trim() : '';
                  if (!msg) {
                    toast.error('该操作缺少 message，无法发送');
                    return;
                  }
                  let tripOverride: string | undefined = undefined;
                  if (op.payload?.trip_id != null && String(op.payload.trip_id).trim() !== '') {
                    const s = sanitizeRouteRunTripId(String(op.payload.trip_id));
                    if (s) tripOverride = s;
                    else {
                      toast.warning('payload.trip_id 不是合法 UUID，将使用当前会话绑定的行程');
                    }
                  }
                  const intentMode = parseIntentModeFromSuggestedPayload(
                    op.payload as Record<string, unknown> | undefined
                  );
                  onRouteRunMessage(msg, tripOverride, intentMode);
                  return;
                }

                if (isNav) {
                  const routeName =
                    typeof op.payload?.route === 'string' ? op.payload.route.trim() : '';
                  const tripRaw =
                    op.payload?.trip_id != null ? String(op.payload.trip_id) : undefined;
                  const path = pathForSuggestedClientNavigation(routeName, tripRaw);
                  if (!path) {
                    toast.error(
                      routeName === 'timeline' || routeName === 'itinerary'
                        ? '该跳转需要有效的行程 ID（payload.trip_id）'
                        : '无法解析导航路径'
                    );
                    return;
                  }
                  navigate(path);
                  return;
                }
              }}
            >
              {isNav ? (
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden />
              ) : (
                <Zap className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden />
              )}
              <span className="truncate">{op.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
