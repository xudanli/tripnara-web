import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  confirmResearchDeposit,
  fetchPaymentCatalog,
  isExplorationUnavailable,
  refundResearchDeposit,
  startResearchDeposit,
  submitPriceLock,
} from '../api/client';
import type { ResearchPaymentCatalogItem } from '../api/types';
import { Input } from '@/components/ui/input';
import { ResearchDisclaimer } from './ResearchDisclaimer';

interface DepositCheckoutPanelProps {
  sessionId: string;
  email: string;
}

export function DepositCheckoutPanel({ sessionId, email }: DepositCheckoutPanelProps) {
  const [catalog, setCatalog] = useState<ResearchPaymentCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositPaid, setDepositPaid] = useState(false);
  const [priceLockUsd, setPriceLockUsd] = useState(49);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPaymentCatalog();
        if (!cancelled) setCatalog(data.items ?? []);
      } catch (err) {
        if (isExplorationUnavailable(err) && !cancelled) {
          setCatalog([
            {
              skuId: 'research-deposit-v1',
              title: '可退研究订金',
              amountUsd: 29,
              refundable: true,
              legalDisclaimer: '7 天内可一键全额退款',
            },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeposit = async () => {
    setBusy(true);
    try {
      const start = await startResearchDeposit(sessionId);
      if (start.sandbox || !start.clientSecret) {
        await confirmResearchDeposit(sessionId);
        setDepositPaid(true);
        toast.success('沙箱模式：订金已模拟支付成功');
        return;
      }
      toast.message('请在 Stripe Payment Element 完成支付（待接入 @stripe/react-stripe-js）');
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        setDepositPaid(true);
        toast.message('演示模式：订金已模拟');
      } else {
        toast.error(err instanceof Error ? err.message : '订金流程失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async () => {
    setBusy(true);
    try {
      await refundResearchDeposit(sessionId);
      setDepositPaid(false);
      toast.success('退款已提交');
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        setDepositPaid(false);
        toast.message('演示模式：已模拟退款');
      } else {
        toast.error(err instanceof Error ? err.message : '退款失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePriceLock = async () => {
    setBusy(true);
    try {
      await submitPriceLock(sessionId, {
        lockedPriceUsd: priceLockUsd,
        email: email || undefined,
      });
      toast.success('价格锁定已登记');
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        toast.message('演示模式：价格锁定已登记');
      } else {
        toast.error(err instanceof Error ? err.message : '价格锁定失败');
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        加载支付选项…
      </p>
    );
  }

  const depositSku = catalog.find((c) => c.refundable) ?? catalog[0];

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
      <p className="text-xs font-semibold text-foreground">订金与价格锁定（Sprint 4B）</p>
      <ResearchDisclaimer className="mb-0 p-2 rounded-lg text-[11px] leading-snug" />

      {depositSku && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-foreground font-medium">{depositSku.title}</p>
          {depositSku.amountUsd != null && (
            <p className="text-[11px] text-muted-foreground">
              ${depositSku.amountUsd} USD · {depositSku.legalDisclaimer}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" className="h-7 text-xs" disabled={busy || depositPaid} onClick={handleDeposit}>
              {depositPaid ? '已支付订金' : '支付可退订金'}
            </Button>
            {depositPaid && (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={handleRefund}>
                一键退款
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-2.5 space-y-1.5">
        <p className="text-[11px] font-medium text-foreground">价格锁定（无支付）</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            type="number"
            className="w-20 h-7 text-xs"
            value={priceLockUsd}
            onChange={(e) => setPriceLockUsd(Number(e.target.value))}
          />
          <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" disabled={busy} onClick={handlePriceLock}>
            锁定此价格
          </Button>
        </div>
      </div>
    </div>
  );
}
