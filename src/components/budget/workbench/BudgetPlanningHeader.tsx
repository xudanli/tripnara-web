import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { workbenchHeaderShell, workbenchHeaderTitle } from '@/components/plan-studio/workbench/workbench-ui';
import type { BudgetViewMode } from './budget-planning.util';

export interface BudgetPlanningHeaderProps {
  isZh: boolean;
  viewMode: BudgetViewMode;
  onViewModeChange: (mode: BudgetViewMode) => void;
  currency: string;
  onCurrencyChange?: (currency: string) => void;
  alertMessage?: string | null;
  onViewOptimization?: () => void;
}

const CURRENCY_OPTIONS = ['CNY', 'USD', 'EUR', 'ISK'] as const;

export function BudgetPlanningHeader({
  isZh,
  viewMode,
  onViewModeChange,
  currency,
  onCurrencyChange,
  alertMessage,
  onViewOptimization,
}: BudgetPlanningHeaderProps) {
  return (
    <header className={cn(workbenchHeaderShell, 'px-4 py-3 sm:px-5')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={workbenchHeaderTitle}>
            {isZh ? '预算管理' : 'Budget Planning'}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isZh ? '意图 · 结构 · 分摊 · 价值' : 'Intent · Structure · Split · Value'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(value) => onViewModeChange(value as BudgetViewMode)}
          >
            <SelectTrigger className="h-8 w-[168px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_capita">
                {isZh ? '按人均预算显示' : 'Per capita view'}
              </SelectItem>
              <SelectItem value="total">{isZh ? '按总预算显示' : 'Total budget view'}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currency} onValueChange={onCurrencyChange} disabled={!onCurrencyChange}>
            <SelectTrigger className="h-8 w-[88px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {alertMessage ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gate-confirm-border/60 bg-gate-confirm/10 px-3 py-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gate-confirm-foreground" />
            <p className="text-xs leading-relaxed text-gate-confirm-foreground">{alertMessage}</p>
          </div>
          {onViewOptimization ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 border-gate-confirm-border text-xs"
              onClick={onViewOptimization}
            >
              {isZh ? '查看优化方案' : 'View optimization'}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
