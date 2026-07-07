import { ChevronRight, CircleDollarSign, ClipboardList, Users, Wallet } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  workbenchCard,
  workbenchProgressTrack,
  workbenchSecondaryMetric,
} from '@/components/plan-studio/workbench/workbench-ui';
import { STRUCTURE_CATEGORY_META } from '@/lib/trip-budget-structure';
import { formatCurrency } from '@/utils/format';
import type {
  BudgetAllocations,
  PaymentRuleMode,
  SpendingPersona,
} from '@/types/trip-budget';
import { BudgetConstraintsCard } from './BudgetConstraintsCard';
import { BudgetSplitRulesCard } from './BudgetSplitRulesCard';
import type { SplitRuleCardModel } from './budget-split-rules.util';
import type { BudgetConstraintRow } from './budget-constraints-card.util';
import type { BudgetHealthLevel, BudgetViewMode } from './budget-planning.util';
import { PAYMENT_RULE_LABEL } from '@/hooks/useTripBudgetProfile';
import { BarChart3 } from 'lucide-react';

export interface BudgetPlanningSidebarProps {
  isZh: boolean;
  memberCount: number;
  memberNames: string[];
  viewMode: BudgetViewMode;
  displayTotal: number;
  displayRemaining: number;
  usagePercent: number;
  bufferRate: number;
  healthLevel: BudgetHealthLevel;
  healthLabel: string;
  currency: string;
  selectedCategory: keyof BudgetAllocations | 'all';
  onCategoryChange: (category: keyof BudgetAllocations | 'all') => void;
  paymentRuleMode?: PaymentRuleMode | null;
  spendingPersona?: SpendingPersona | null;
  hasActuals: boolean;
  actualTotal: number;
  onOpenIntent: () => void;
  onOpenStructure: () => void;
  onOpenWallet: () => void;
  onOpenActuals: () => void;
  constraintRows: BudgetConstraintRow[];
  splitRuleCards: SplitRuleCardModel[];
  onEditConstraints?: () => void;
  onViewSplitDetails?: () => void;
}

const PERSONA_TAGLINE: Record<SpendingPersona, { zh: string; en: string }> = {
  experience: { zh: '体验优先 · 合理控制', en: 'Experience first · balanced control' },
  quality: { zh: '品质住宿 · 适度体验', en: 'Quality stay · curated picks' },
  frugal: { zh: '节俭出行 · 控制开支', en: 'Frugal · cost conscious' },
  efficiency: { zh: '效率优先 · 时间换体验', en: 'Efficiency · time is money' },
  balanced: { zh: '均衡分配 · 全面体验', en: 'Balanced · well-rounded' },
};

function healthDotClass(level: BudgetHealthLevel) {
  switch (level) {
    case 'critical':
      return 'bg-gate-reject-foreground';
    case 'caution':
      return 'bg-gate-confirm-foreground';
    default:
      return 'bg-gate-allow-foreground';
  }
}

function progressIndicatorClass(level: BudgetHealthLevel) {
  switch (level) {
    case 'critical':
      return '[&>div]:bg-gate-reject-foreground';
    case 'caution':
      return '[&>div]:bg-gate-confirm-foreground';
    default:
      return '[&>div]:bg-gate-allow-foreground';
  }
}

export function BudgetPlanningSidebar({
  isZh,
  memberCount,
  memberNames,
  viewMode,
  displayTotal,
  displayRemaining,
  usagePercent,
  bufferRate,
  healthLevel,
  healthLabel,
  currency,
  selectedCategory,
  onCategoryChange,
  paymentRuleMode,
  spendingPersona,
  hasActuals,
  actualTotal,
  onOpenIntent,
  onOpenStructure,
  onOpenWallet,
  onOpenActuals,
  constraintRows,
  splitRuleCards,
  onEditConstraints,
  onViewSplitDetails,
}: BudgetPlanningSidebarProps) {
  const perCapita = viewMode === 'per_capita' && memberCount > 1;
  const suffix = perCapita ? (isZh ? ' /人' : ' /pp') : '';

  const personaTagline = spendingPersona
    ? isZh
      ? PERSONA_TAGLINE[spendingPersona].zh
      : PERSONA_TAGLINE[spendingPersona].en
    : isZh
      ? '尚未设置消费偏好'
      : 'No spending preference yet';

  const walletSubtitle = paymentRuleMode
    ? isZh
      ? `${PAYMENT_RULE_LABEL[paymentRuleMode].zh} · 统一资金池管理`
      : `${PAYMENT_RULE_LABEL[paymentRuleMode].en} · unified fund pool`
    : isZh
      ? '统一资金池管理'
      : 'Unified fund pool';

  const actualsSubtitle = hasActuals
    ? isZh
      ? `已记录 ${formatCurrency(actualTotal, currency)}`
      : `${formatCurrency(actualTotal, currency)} recorded`
    : isZh
      ? '尚未发生实际支出'
      : 'No actual expenditure yet';

  const menuItems: Array<{
    key: string;
    icon: typeof CircleDollarSign;
    iconSurface: string;
    title: string;
    subtitle: string;
    badge?: string;
    onClick: () => void;
  }> = [
    {
      key: 'intent',
      icon: CircleDollarSign,
      iconSurface: 'bg-gate-allow/20 text-gate-allow-foreground',
      title: isZh ? '预算意图' : 'Budget intent',
      subtitle: spendingPersona
        ? personaTagline
        : isZh
          ? '设置总预算与消费方向'
          : 'Set total budget and spending direction',
      onClick: onOpenIntent,
    },
    {
      key: 'structure',
      icon: BarChart3,
      iconSurface: 'bg-muted/15 text-muted-foreground',
      title: isZh ? '结构预算' : 'Structure budget',
      subtitle: isZh ? '按类别分配上限' : 'Allocation limit by category',
      onClick: onOpenStructure,
    },
    {
      key: 'wallet',
      icon: Wallet,
      iconSurface: 'bg-primary/10 text-primary',
      title: 'Travel Wallet',
      subtitle: walletSubtitle,
      onClick: onOpenWallet,
    },
    {
      key: 'actuals',
      icon: ClipboardList,
      iconSurface: 'bg-gate-confirm/15 text-gate-confirm-foreground',
      title: isZh ? '实际流水' : 'Actual flow',
      subtitle: actualsSubtitle,
      badge: !hasActuals ? (isZh ? '规划中' : 'Planning') : undefined,
      onClick: onOpenActuals,
    },
  ] ;

  return (
    <div className="space-y-3 p-3">
      {/* 预算概览卡 */}
      <section className={cn(workbenchCard, 'p-4')}>
        <div className="space-y-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {isZh ? '总规划预算' : 'Total planned budget'}
            </p>
            <p className={cn('mt-1 text-lg font-bold leading-tight', workbenchSecondaryMetric)}>
              {formatCurrency(displayTotal, currency)}
              <span className="text-xs font-semibold text-muted-foreground">{suffix}</span>
            </p>
          </div>
          <div className="min-w-0 border-t border-border/50 pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {isZh ? '剩余缓冲' : 'Remaining buffer'}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums leading-tight text-gate-allow-foreground">
              {formatCurrency(Math.max(displayRemaining, 0), currency)}
              <span className="text-xs font-semibold text-muted-foreground">{suffix}</span>
            </p>
          </div>
        </div>

        {memberCount > 0 ? (
          <div className="mt-4 flex items-start gap-2 border-t border-border/50 pt-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {isZh ? `${memberCount} 位旅行者` : `${memberCount} travelers`}
              </p>
              {memberNames.length > 0 ? (
                <p className="mt-0.5 truncate text-[11px] leading-relaxed text-muted-foreground">
                  {memberNames.join(', ')}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{isZh ? '预算健康度' : 'Budget health'}</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <span className={cn('h-2 w-2 rounded-full', healthDotClass(healthLevel))} />
              {healthLabel}
            </span>
          </div>
          <Progress
            value={Math.min(usagePercent, 100)}
            className={cn(workbenchProgressTrack, progressIndicatorClass(healthLevel))}
          />
          <p className="text-[11px] text-muted-foreground">
            {isZh ? '缓冲率' : 'Buffer rate'}{' '}
            <span className="tabular-nums font-medium text-foreground">{bufferRate.toFixed(1)}%</span>
            {isZh ? '（建议 5–15%）' : ' (target 5–15%)'}
          </p>
        </div>
      </section>

      {/* 四层预算入口 */}
      <section className={cn(workbenchCard, 'overflow-hidden')}>
        <ul className="divide-y divide-border/60">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30"
                  onClick={item.onClick}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      item.iconSurface,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      {item.badge ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <BudgetConstraintsCard isZh={isZh} rows={constraintRows} onEdit={onEditConstraints} />

      {memberCount >= 2 ? (
        <BudgetSplitRulesCard
          isZh={isZh}
          cards={splitRuleCards}
          onViewDetails={onViewSplitDetails}
        />
      ) : null}

      {/* 类别筛选 · 紧凑 */}
      <section className={cn(workbenchCard, 'p-3')}>
        <p className="text-[11px] font-medium text-muted-foreground">{isZh ? '类别筛选' : 'Categories'}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
              selectedCategory === 'all'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/40',
            )}
            onClick={() => onCategoryChange('all')}
          >
            {isZh ? '全部' : 'All'}
          </button>
          {STRUCTURE_CATEGORY_META.map((meta) => {
            const Icon = meta.icon;
            return (
              <button
                key={meta.key}
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                  selectedCategory === meta.key
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/40',
                )}
                onClick={() => onCategoryChange(meta.key)}
              >
                <Icon className="h-3 w-3" />
                {isZh ? meta.labelZh : meta.labelEn}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
