import { Shield } from 'lucide-react';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDecisionDnaConsent, useUpdateDecisionDnaConsent } from '@/hooks/useDecisionDna';
import {
  DECISION_DNA_SIGNAL_TIER_ENTRIES,
  decisionDnaSignalTierLabel,
} from '@/lib/decision-dna-display';
import { toast } from 'sonner';

/** 设置页 · Decision DNA 隐式学习 consent */
export function DecisionDnaConsentPanel() {
  const { data, isLoading, isError } = useDecisionDnaConsent();
  const updateMutation = useUpdateDecisionDnaConsent();

  const handleToggle = async (checked: boolean) => {
    try {
      await updateMutation.mutateAsync({ implicit_learning: checked });
      toast.success(checked ? '已开启隐式学习' : '已关闭隐式学习');
    } catch {
      toast.error('更新失败，请稍后重试');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <LogoLoading size={20} />
        加载隐私设置…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        Decision DNA 隐私设置暂不可用
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="decision-dna-implicit-learning" className="text-base font-medium">
              Decision DNA 隐式学习
            </Label>
          <p className="text-sm text-muted-foreground">
            开启后，系统可从您的方案调整记录中学习偏好，可随时关闭；默认关闭，未 opt-in 时不会进行此类学习。
          </p>
            {data.explicit_signals_always_allowed && (
              <p className="text-xs text-muted-foreground">
                你主动确认的选择始终允许记录。
              </p>
            )}
            {data.granted_at && data.implicit_learning && (
              <p className="text-xs text-muted-foreground">
                开启于 {new Date(data.granted_at).toLocaleString()}
              </p>
            )}
            {data.revoked_at && !data.implicit_learning && (
              <p className="text-xs text-muted-foreground">
                关闭于 {new Date(data.revoked_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <Switch
          id="decision-dna-implicit-learning"
          checked={data.implicit_learning}
          disabled={updateMutation.isPending}
          onCheckedChange={handleToggle}
        />
      </div>

      <div className="rounded-lg border px-4 py-3 text-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          信号分级（只读）
        </p>
        <ul className="space-y-2">
          {DECISION_DNA_SIGNAL_TIER_ENTRIES.map(({ key, label }) => {
            const tier = data.signal_tiers[key];
            return (
              <li key={key} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">{label}</span>
                <Badge variant="outline" className="font-normal">
                  {decisionDnaSignalTierLabel(tier)}
                </Badge>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
