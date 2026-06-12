/**
 * route_and_run：ui_display.booking_cart + POST /agent/booking_cart/apply checkout 流
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  applyBookingCartAction,
  deepLinkForCartItem,
  openBookingCartDeepLinks,
} from '@/lib/booking-cart-checkout';
import {
  BOOKING_CART_STATE_LABELS,
  bookingCartItemHref,
  bookingCartSelectedIds,
  isBookingCartItemSelected,
  needsOverBudgetAcknowledge,
} from '@/lib/booking-cart-ui';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';
import type { BookingCartItem, BookingCartPayload, BookingCartState } from '@/types/booking-cart';
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  ExternalLink,
  Hotel,
  Loader2,
  Plane,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';

export interface BookingCartPanelProps {
  cart: BookingCartPayload;
  tripId?: string | null;
  disabled?: boolean;
  className?: string;
}

function iconForKind(kind: BookingCartItem['kind']) {
  const k = String(kind).toLowerCase();
  if (k.includes('flight') || k === 'plane') return Plane;
  if (k.includes('car')) return Car;
  if (k.includes('hotel') || k.includes('accommodation')) return Hotel;
  return ShoppingCart;
}

const KIND_LABELS: Record<string, string> = {
  flight: '航班',
  hotel: '酒店',
  accommodation: '住宿',
  car_rental: '租车',
};

function kindLabel(kind: BookingCartItem['kind']): string {
  const k = String(kind).toLowerCase();
  return KIND_LABELS[k] ?? kind;
}

const STATE_BADGE: Partial<
  Record<BookingCartState, { className: string; icon: typeof CheckCircle2 }>
> = {
  draft: {
    className: 'border-slate-500/30 bg-slate-100/80 text-slate-900 dark:bg-slate-900/40 dark:text-slate-100',
    icon: ShoppingCart,
  },
  optimized: {
    className: 'border-emerald-500/35 bg-emerald-50/80 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100',
    icon: CheckCircle2,
  },
  over_budget: {
    className: 'border-amber-500/40 bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100',
    icon: AlertTriangle,
  },
  ready_to_checkout: {
    className: 'border-sky-500/35 bg-sky-50/80 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100',
    icon: CheckCircle2,
  },
  checkout_submitted: {
    className: 'border-violet-500/35 bg-violet-50/80 text-violet-950 dark:bg-violet-950/30 dark:text-violet-100',
    icon: CheckCircle2,
  },
};

function formatBudgetLine(cart: BookingCartPayload): string | null {
  const sel = cart.selection;
  const budget = cart.budget;
  if (!sel && !budget) return null;

  const parts: string[] = [];
  if (sel?.total_price_label) {
    parts.push(`合计 ${sel.total_price_label}`);
  } else if (sel?.total_price_numeric != null) {
    const cur = sel.currency ?? budget?.currency ?? '';
    parts.push(`合计 ${cur ? `${cur} ` : ''}${sel.total_price_numeric.toLocaleString()}`);
  }
  if (budget?.limit_label) {
    parts.push(`预算 ${budget.limit_label}`);
  } else if (budget?.limit != null) {
    const cur = budget.currency ?? sel?.currency ?? '';
    parts.push(`预算 ${cur ? `${cur} ` : ''}${budget.limit.toLocaleString()}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function BookingCartPanel({ cart: cartProp, tripId, disabled, className }: BookingCartPanelProps) {
  const [cart, setCart] = useState<BookingCartPayload>(cartProp);
  const [busy, setBusy] = useState(false);
  const [overBudgetDialogOpen, setOverBudgetDialogOpen] = useState(false);

  useEffect(() => {
    setCart(cartProp);
  }, [cartProp]);

  const sanitizedTripId = tripId ? sanitizeRouteRunTripId(tripId) : null;
  const selectedIds = useMemo(() => bookingCartSelectedIds(cart), [cart]);
  const cartState = cart.cart_state ?? 'draft';
  const stateMeta = STATE_BADGE[cartState] ?? STATE_BADGE.draft!;
  const StateIcon = stateMeta.icon;
  const budgetLine = formatBudgetLine(cart);
  const showSelectedHighlight = selectedIds.size > 0;
  const apiEnabled = Boolean(sanitizedTripId);

  const runApply = useCallback(
    async (
      action: import('@/types/booking-cart').BookingCartApplyAction,
      payload?: Record<string, unknown>
    ) => {
      if (!sanitizedTripId) {
        toast.error('需要绑定有效行程 ID 才能更新预订清单');
        return null;
      }
      setBusy(true);
      try {
        const res = await applyBookingCartAction({
          tripId: sanitizedTripId,
          cart,
          action,
          payload,
        });
        setCart(res.cart);
        if (res.message) toast.message(res.message);
        return res;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '预订清单更新失败');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [cart, sanitizedTripId]
  );

  const handleToggleItem = async (itemId: string) => {
    const next = new Set(selectedIds);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    await runApply('update_selection', { selected_item_ids: Array.from(next) });
  };

  const handleApplySaving = async (savingIndex: number) => {
    await runApply('apply_saving', { saving_index: savingIndex });
  };

  const runCheckout = async (acknowledgeOverBudget: boolean) => {
    if (cart.cart_state !== 'ready_to_checkout') {
      const confirmRes = await runApply('confirm_ready', {
        acknowledge_over_budget: acknowledgeOverBudget,
      });
      if (!confirmRes) return;

      if (confirmRes.cart.cart_state !== 'ready_to_checkout') {
        if (needsOverBudgetAcknowledge(confirmRes.cart)) {
          setOverBudgetDialogOpen(true);
        }
        return;
      }
    }

    const submitRes = await runApply('submit_checkout');
    if (!submitRes) return;

    const opened = openBookingCartDeepLinks(submitRes.checkout ?? submitRes.cart.checkout);
    if (opened > 0) {
      toast.success(`已打开 ${opened} 个预订链接`);
    } else {
      toast.success('预订意向已提交');
    }
  };

  const handleCheckoutClick = () => {
    if (needsOverBudgetAcknowledge(cart)) {
      setOverBudgetDialogOpen(true);
      return;
    }
    void runCheckout(false);
  };

  if (!cart.items.length) return null;

  return (
    <>
      <Card className={cn('border-border/80 bg-card/60', className)}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" aria-hidden />
                {cart.headline_zh?.trim() || '预订清单'}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {cart.summary_zh?.trim() ||
                  (apiEnabled
                    ? '点选条目更新组合；确认后提交预订意向并打开 deep link。'
                    : '绑定有效行程后可走 checkout API；当前仅展示快照。')}
              </CardDescription>
            </div>
            <Badge variant="outline" className={cn('text-[10px] gap-1 h-6', stateMeta.className)}>
              <StateIcon className="h-3 w-3" aria-hidden />
              {BOOKING_CART_STATE_LABELS[cartState]}
            </Badge>
          </div>
          {budgetLine ? (
            <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">{budgetLine}</p>
          ) : null}
          {cart.budget?.transport_share_hint || cart.budget?.accommodation_share_hint ? (
            <p className="text-[10px] text-muted-foreground/90 mt-1 leading-relaxed">
              {[cart.budget.transport_share_hint, cart.budget.accommodation_share_hint]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
          {cartState === 'over_budget' ? (
            <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-2 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
              当前组合超出预算，请应用换选建议或确认后继续。
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {cart.savings_opportunities && cart.savings_opportunities.length > 0 ? (
            <div className="rounded-lg border border-amber-500/25 bg-amber-50/35 px-3 py-2 dark:bg-amber-950/20">
              <div className="text-[10px] font-medium uppercase tracking-wide text-amber-900/80 dark:text-amber-100/80 mb-2">
                省预算 · 换选建议
              </div>
              <div className="flex flex-col gap-1.5">
                {cart.savings_opportunities.map((opp, idx) => (
                  <Button
                    key={opp.opportunity_id ?? `${opp.label_zh}-${idx}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || busy || !apiEnabled}
                    className="h-auto min-h-8 justify-start gap-2 py-1.5 px-2.5 text-left text-xs whitespace-normal"
                    onClick={() => void handleApplySaving(idx)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
                    <span className="flex-1">
                      {opp.label_zh}
                      {opp.savings_label_zh ? (
                        <span className="text-muted-foreground"> · {opp.savings_label_zh}</span>
                      ) : null}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {cart.items.map((item) => {
              const Icon = iconForKind(item.kind);
              const fallbackHref = bookingCartItemHref(item);
              const deepLink = deepLinkForCartItem(cart.checkout, item.item_id);
              const href = deepLink ?? fallbackHref;
              const needsReview = item.status === 'needs_review';
              const selected =
                showSelectedHighlight && isBookingCartItemSelected(item.item_id, selectedIds);
              const submitted = cartState === 'checkout_submitted';

              return (
                <div
                  key={item.item_id}
                  role={apiEnabled && !submitted ? 'button' : undefined}
                  tabIndex={apiEnabled && !submitted ? 0 : undefined}
                  onClick={() => {
                    if (!apiEnabled || submitted || disabled || busy) return;
                    void handleToggleItem(item.item_id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (!apiEnabled || submitted || disabled || busy) return;
                      e.preventDefault();
                      void handleToggleItem(item.item_id);
                    }
                  }}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between transition-colors',
                    selected
                      ? 'border-emerald-500/45 bg-emerald-50/35 dark:bg-emerald-950/20'
                      : 'border-border/70 bg-muted/15',
                    apiEnabled && !submitted && !disabled && !busy && 'cursor-pointer hover:bg-muted/25'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] gap-1 h-5">
                        <Icon className="h-3 w-3" aria-hidden />
                        {kindLabel(item.kind)}
                      </Badge>
                      {selected ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 border-emerald-600/30 bg-emerald-100/90 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100"
                        >
                          已预选
                        </Badge>
                      ) : null}
                      {needsReview ? (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          待确认
                        </Badge>
                      ) : null}
                      {item.price_label ? (
                        <span className="text-[10px] font-medium text-foreground tabular-nums">
                          {item.price_label}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">{item.label_zh}</div>
                    {item.subtitle_zh ? (
                      <div className="text-xs text-muted-foreground">{item.subtitle_zh}</div>
                    ) : null}
                    {item.date_label_zh ? (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.date_label_zh}</div>
                    ) : null}
                  </div>
                  {href && submitted ? (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      disabled={disabled || busy}
                      className="h-8 shrink-0 rounded-full text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(href, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      去预订
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {apiEnabled && cartState !== 'checkout_submitted' ? (
            <Button
              type="button"
              className="w-full gap-2"
              disabled={disabled || busy || cartState === 'checkout_submitted'}
              onClick={handleCheckoutClick}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              确认并去预订
            </Button>
          ) : null}

          {cartState === 'checkout_submitted' && cart.checkout?.deep_links?.length ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              disabled={disabled || busy}
              onClick={() => {
                const n = openBookingCartDeepLinks(cart.checkout);
                if (n === 0) toast.info('暂无预订链接');
              }}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              再次打开全部预订链接
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={overBudgetDialogOpen} onOpenChange={setOverBudgetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>当前组合超出预算</AlertDialogTitle>
            <AlertDialogDescription>
              继续提交将超出您设置的行程预算上限。建议先应用「省预算」换选；若仍要预订，请确认后继续。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOverBudgetDialogOpen(false);
                void runCheckout(true);
              }}
            >
              确认超预算并继续
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
