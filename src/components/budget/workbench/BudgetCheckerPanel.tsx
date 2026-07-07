import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  workbenchCard,
  workbenchDecisionCheckerBadgeClass,
  workbenchDecisionCheckerTabList,
  workbenchDecisionCheckerTabTrigger,
  workbenchInsetSection,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchSecondaryMetric,
} from '@/components/plan-studio/workbench/workbench-ui';
import { formatCurrency } from '@/utils/format';
import type { WalletMember } from '@/types/trip-budget';
import type { BudgetHotspot, BudgetSuggestion, BudgetPriceEvidence } from './budget-planning.util';

export type { BudgetPriceEvidence };

export interface BudgetEvidenceItem {
  id: string;
  title: string;
  body: string;
  source?: string;
}

export interface BudgetCheckerPanelProps {
  isZh: boolean;
  currency: string;
  hotspots: BudgetHotspot[];
  suggestions: BudgetSuggestion[];
  members: WalletMember[];
  perCapitaShare: number;
  splitRuleTags?: string[];
  priceEvidence?: BudgetPriceEvidence;
  budgetEvidence?: BudgetEvidenceItem[];
  loadingOptimizations?: boolean;
  applyingOptimization?: boolean;
  draftReady?: boolean;
  onRefresh?: () => void;
  onGenerateDraft?: () => void;
  onApplyAllOptimizations?: () => void;
  onApplyOptimization?: (optimizationId: string) => void;
  onDiscussWithNara?: () => void;
  onViewSplitDetails?: () => void;
}

const HOTSPOT_PREVIEW = 3;
const SUGGESTION_PREVIEW = 3;

function riskBadge(risk: BudgetHotspot['risk'], isZh: boolean) {
  const label =
    risk === 'high' ? (isZh ? '高' : 'High') : risk === 'medium' ? (isZh ? '中' : 'Med') : isZh ? '低' : 'Low';
  const tone = risk === 'high' ? 'danger' : risk === 'medium' ? 'warning' : 'neutral';
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          risk === 'high'
            ? 'bg-gate-reject-foreground'
            : risk === 'medium'
              ? 'bg-gate-confirm-foreground'
              : 'bg-muted-foreground',
        )}
      />
      <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-normal', workbenchDecisionCheckerBadgeClass(tone))}>
        {label}
      </Badge>
    </span>
  );
}

function suggestionToneSurface(tone: BudgetSuggestion['tone']) {
  switch (tone) {
    case 'save':
      return 'bg-gate-allow/15 text-gate-allow-foreground';
    case 'experience':
      return 'bg-gate-confirm/15 text-gate-confirm-foreground';
    default:
      return 'bg-primary/10 text-primary';
  }
}

function ExpandLink({
  isZh,
  expanded,
  total,
  previewCount,
  labelZh,
  labelEn,
  onToggle,
}: {
  isZh: boolean;
  expanded: boolean;
  total: number;
  previewCount: number;
  labelZh: string;
  labelEn: string;
  onToggle: () => void;
}) {
  if (total <= previewCount) return null;
  return (
    <button
      type="button"
      className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] text-primary hover:underline"
      onClick={onToggle}
    >
      {expanded
        ? isZh
          ? '收起'
          : 'Show less'
        : isZh
          ? `${labelZh} (${total})`
          : `${labelEn} (${total})`}
      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
    </button>
  );
}

export function BudgetCheckerPanel({
  isZh,
  currency,
  hotspots,
  suggestions,
  members,
  perCapitaShare,
  splitRuleTags = [],
  priceEvidence,
  budgetEvidence = [],
  loadingOptimizations,
  applyingOptimization,
  draftReady,
  onRefresh,
  onGenerateDraft,
  onApplyAllOptimizations,
  onApplyOptimization,
  onDiscussWithNara,
  onViewSplitDetails,
}: BudgetCheckerPanelProps) {
  const [hotspotsExpanded, setHotspotsExpanded] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);

  const visibleHotspots = hotspotsExpanded ? hotspots : hotspots.slice(0, HOTSPOT_PREVIEW);
  const visibleSuggestions = suggestionsExpanded ? suggestions : suggestions.slice(0, SUGGESTION_PREVIEW);

  const evidenceUpdated =
    priceEvidence?.updatedLabel ?? (isZh ? '2 小时前' : '2 hours ago');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn(workbenchPanelHeader, 'flex items-center justify-between gap-2')}>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className={workbenchPanelTitle}>{isZh ? '预算检查器' : 'Budget checker'}</p>
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium">
            AI
          </Badge>
        </div>
        {onRefresh ? (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
        <Tabs defaultValue="overview">
          <TabsList className={workbenchDecisionCheckerTabList}>
            <TabsTrigger value="overview" className={workbenchDecisionCheckerTabTrigger}>
              {isZh ? '概览' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="evidence" className={workbenchDecisionCheckerTabTrigger}>
              {isZh ? '证据' : 'Evidence'}
            </TabsTrigger>
            <TabsTrigger value="impact" className={workbenchDecisionCheckerTabTrigger}>
              {isZh ? '影响' : 'Impact'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 space-y-3">
            <section className={cn(workbenchCard, 'p-3')}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{isZh ? '超支热点' : 'Overspend hotspots'}</p>
                {hotspots.length > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-gate-confirm-foreground" />
                ) : null}
              </div>

              {hotspots.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {isZh ? '当前未发现明显超支压力点' : 'No major overspend hotspots detected.'}
                </p>
              ) : (
                <>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[280px] text-[11px]">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-muted-foreground">
                          <th className="pb-1.5 pr-2 font-medium">{isZh ? '项目' : 'Item'}</th>
                          <th className="pb-1.5 pr-2 font-medium">{isZh ? '预算' : 'Budget'}</th>
                          <th className="pb-1.5 pr-2 font-medium">{isZh ? '风险' : 'Risk'}</th>
                          <th className="pb-1.5 font-medium">{isZh ? '原因' : 'Reason'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleHotspots.map((spot) => (
                          <tr key={spot.id} className="border-b border-border/40 last:border-0">
                            <td className="max-w-[88px] truncate py-2 pr-2 font-medium">{spot.name}</td>
                            <td className={cn('whitespace-nowrap py-2 pr-2 tabular-nums', workbenchSecondaryMetric)}>
                              {spot.amount != null ? formatCurrency(spot.amount, currency) : '—'}
                            </td>
                            <td className="py-2 pr-2">{riskBadge(spot.risk, isZh)}</td>
                            <td className="max-w-[100px] py-2 text-muted-foreground">{spot.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ExpandLink
                    isZh={isZh}
                    expanded={hotspotsExpanded}
                    total={hotspots.length}
                    previewCount={HOTSPOT_PREVIEW}
                    labelZh="查看全部超支项"
                    labelEn="View all hotspots"
                    onToggle={() => setHotspotsExpanded((v) => !v)}
                  />
                </>
              )}
            </section>

            <section className={cn(workbenchCard, 'p-3')}>
              <p className="text-xs font-semibold">{isZh ? 'AI 预算建议' : 'AI budget suggestions'}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {isZh ? '基于历史数据与团队偏好' : 'Based on history and team preferences'}
              </p>

              {loadingOptimizations ? (
                <p className="mt-3 text-xs text-muted-foreground">{isZh ? '正在加载建议…' : 'Loading…'}</p>
              ) : suggestions.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {isZh ? '生成优化草案后将展示可执行建议' : 'Run optimization draft for actionable suggestions.'}
                </p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2.5">
                    {visibleSuggestions.map((item) => (
                      <li key={item.id} className="flex gap-2.5">
                        <span
                          className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            suggestionToneSurface(item.tone),
                          )}
                        >
                          <Lightbulb className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] leading-snug text-foreground">{item.message}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-[10px] text-muted-foreground">
                              {isZh ? '预计节省' : 'Est. savings'}{' '}
                              <span
                                className={cn(
                                  'font-semibold tabular-nums',
                                  item.savings > 0
                                    ? 'text-gate-allow-foreground'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {formatCurrency(item.savings, currency)}
                                {isZh ? ' /人' : ' /pp'}
                              </span>
                            </p>
                            {item.optimizationId && onApplyOptimization ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                disabled={applyingOptimization}
                                onClick={() => onApplyOptimization(item.optimizationId!)}
                              >
                                {isZh ? '应用' : 'Apply'}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <ExpandLink
                    isZh={isZh}
                    expanded={suggestionsExpanded}
                    total={suggestions.length}
                    previewCount={SUGGESTION_PREVIEW}
                    labelZh="查看全部建议"
                    labelEn="View all suggestions"
                    onToggle={() => setSuggestionsExpanded((v) => !v)}
                  />
                </>
              )}
            </section>
          </TabsContent>

          <TabsContent value="evidence" className="mt-3 space-y-3">
            <BudgetEvidenceSection isZh={isZh} items={budgetEvidence} />
            <PriceEvidenceSection isZh={isZh} evidenceUpdated={evidenceUpdated} priceEvidence={priceEvidence} />
          </TabsContent>

          <TabsContent value="impact" className="mt-3">
            <section className={workbenchInsetSection}>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isZh
                  ? '调整单项费用或消费结构后，此处将展示对总预算、日均节奏与体验完成度的级联影响。'
                  : 'After adjusting line items or structure, cascading impact on total budget and pacing will appear here.'}
              </p>
            </section>
          </TabsContent>
        </Tabs>

        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          <SplitPreviewSection
            isZh={isZh}
            currency={currency}
            members={members}
            perCapitaShare={perCapitaShare}
            splitRuleTags={splitRuleTags}
            onViewSplitDetails={onViewSplitDetails}
          />
          <PriceEvidenceSection isZh={isZh} evidenceUpdated={evidenceUpdated} priceEvidence={priceEvidence} />
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-border/60 bg-background px-3 py-3">
        <Button
          type="button"
          className={cn('h-9 w-full text-xs', workbenchPrimaryAction)}
          onClick={onGenerateDraft}
          disabled={!onGenerateDraft || applyingOptimization || loadingOptimizations}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {draftReady
            ? isZh
              ? '预览优化草案'
              : 'Preview optimization draft'
            : isZh
              ? '生成预算优化草案'
              : 'Generate optimization draft'}
        </Button>
        {draftReady && onApplyAllOptimizations ? (
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-full text-xs"
            onClick={onApplyAllOptimizations}
            disabled={applyingOptimization || loadingOptimizations}
          >
            {isZh ? '应用全部优化' : 'Apply all optimizations'}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-8 w-full border-primary/30 text-xs text-primary hover:bg-primary/5"
          onClick={onDiscussWithNara}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          {isZh ? '与 Nara 讨论' : 'Discuss with Nara'}
        </Button>
      </div>
    </div>
  );
}

function SplitPreviewSection({
  isZh,
  currency,
  members,
  perCapitaShare,
  splitRuleTags,
  onViewSplitDetails,
}: {
  isZh: boolean;
  currency: string;
  members: WalletMember[];
  perCapitaShare: number;
  splitRuleTags: string[];
  onViewSplitDetails?: () => void;
}) {
  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">
          {isZh ? '团队分摊预览' : 'Team split preview'}
          <span className="ml-1 font-normal text-muted-foreground">
            {isZh ? '(人均)' : '(per person)'}
          </span>
        </p>
        {onViewSplitDetails ? (
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-[11px] text-primary"
            onClick={onViewSplitDetails}
          >
            {isZh ? '查看详情' : 'Details'}
          </Button>
        ) : null}
      </div>

      {members.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {isZh
            ? '成员列表需由后端 wallet.members 或分摊共识同步；可在左栏 Travel Wallet 或团队设置中配置。'
            : 'Members sync from wallet.members or split consensus; configure in Travel Wallet or team settings.'}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {member.displayName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">{member.displayName}</p>
                <p className={cn('text-xs font-semibold tabular-nums', workbenchSecondaryMetric)}>
                  {formatCurrency(perCapitaShare, currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {splitRuleTags.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" />
            {isZh ? '分摊规则' : 'Split rules'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {splitRuleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BudgetEvidenceSection({
  isZh,
  items,
}: {
  isZh: boolean;
  items: BudgetEvidenceItem[];
}) {
  if (items.length === 0) {
    return (
      <section className={cn(workbenchInsetSection, 'text-xs text-muted-foreground')}>
        {isZh
          ? '运行预算评估后，将展示 L1/L2 分配与违规项等结构化证据。'
          : 'Structured evidence appears after budget evaluation.'}
      </section>
    );
  }

  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <p className="text-xs font-semibold">{isZh ? '预算证据' : 'Budget evidence'}</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-border/60 bg-background px-2.5 py-2">
            <p className="text-[11px] font-medium text-foreground">{item.title}</p>
            {item.body ? (
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.body}</p>
            ) : null}
            {item.source ? (
              <p className="mt-1 text-[10px] text-muted-foreground">{item.source}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PriceEvidenceSection({
  isZh,
  evidenceUpdated,
  priceEvidence,
}: {
  isZh: boolean;
  evidenceUpdated: string;
  priceEvidence?: BudgetPriceEvidence;
}) {
  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <p className="text-xs font-semibold">
        {isZh ? '价格证据' : 'Price evidence'}
        <span className="ml-1 font-normal text-muted-foreground">
          ({isZh ? '更新时间' : 'Updated'}: {evidenceUpdated})
        </span>
      </p>
      <ul className="mt-3 space-y-2 text-[11px]">
        {priceEvidence?.allocationSummary ? (
          <li>
            <span className="text-muted-foreground">{isZh ? 'L1/L2 分配' : 'L1/L2 allocation'} · </span>
            <span className="text-foreground">{priceEvidence.allocationSummary}</span>
          </li>
        ) : null}
        <li>
          <span className="text-muted-foreground">{isZh ? '汇率' : 'FX'} · </span>
          <span className="text-foreground">
            {priceEvidence?.fxRate ??
              (isZh ? '1 CNY = 实时汇率（参考 xe.com）' : '1 CNY = live rate (xe.com)')}
          </span>
        </li>
        <li>
          <span className="text-muted-foreground">{isZh ? '门票价格' : 'Tickets'} · </span>
          <span className="text-foreground">
            {priceEvidence?.tickets ??
              (isZh ? '官方渠道 + 历史成交价' : 'Official + historical fills')}
          </span>
        </li>
        <li>
          <span className="text-muted-foreground">{isZh ? '租车报价' : 'Car rental'} · </span>
          <span className="text-foreground">
            {priceEvidence?.carRental ?? (isZh ? '供应商实时报价' : 'Live supplier quotes')}
          </span>
        </li>
      </ul>
    </section>
  );
}
