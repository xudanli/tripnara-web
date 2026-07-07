import { useState } from 'react';
import { format } from 'date-fns';
import { Check, ChevronRight, LifeBuoy, Phone, Shield, Sparkles, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  workbenchCard,
  workbenchDecisionCheckerAiBox,
  workbenchDecisionCheckerBadgeClass,
  workbenchDecisionCheckerMetricValueClass,
  workbenchDecisionCheckerTabList,
  workbenchDecisionCheckerTabTrigger,
  workbenchEmptyHint,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchScrollable,
} from '@/components/plan-studio/workbench/workbench-ui';
import { semanticGoodText } from '@/lib/semantic-ui-classes';
import type { FallbackPlan } from '@/api/execution';
import {
  buildExecuteDecisionSidebarModel,
  safetyToneClass,
  type ExecuteEmergencyContactKind,
  type ExecuteEmergencyContactModel,
  type ExecutePlanBCardModel,
} from '@/lib/execute-decision-sidebar.util';
import { useExecuteCausalInsight } from '@/hooks/useExecuteCausalInsight';
import { ExecuteCausalInsightPanel } from '@/components/execute/live/ExecuteCausalInsightPanel';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';
import { cn } from '@/lib/utils';

interface ExecuteDecisionSidebarProps {
  tripId?: string | null;
  advisory: TripExecutionAdvisoryDto | null;
  fallbackPlan?: FallbackPlan | null;
  loading?: boolean;
  onOpenDetail?: () => void;
  onApplyPlan?: (id: string) => void;
  onViewEvidence?: () => void;
  onSos?: () => void;
  className?: string;
}

function PlanIndexBadge({ plan }: { plan: ExecutePlanBCardModel }) {
  if (plan.isCurrentPlan) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/30">
        <Check className={cn('h-3 w-3', semanticGoodText)} strokeWidth={3} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
        plan.recommended
          ? 'border border-border bg-primary text-primary-foreground'
          : 'border border-border/70 bg-muted/40 text-muted-foreground',
      )}
    >
      {plan.index}
    </span>
  );
}

function PlanMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 flex-1 px-2 first:pl-0 last:pr-0">
      <p className="text-[9px] text-muted-foreground leading-none mb-1">{label}</p>
      <p className={cn('text-[11px] font-semibold leading-none truncate', valueClassName)}>{value}</p>
    </div>
  );
}

function PlanBCard({
  plan,
  onApply,
}: {
  plan: ExecutePlanBCardModel;
  onApply?: (id: string) => void;
}) {
  return (
    <article
      className={cn(
        'rounded-lg border bg-card overflow-hidden',
        plan.recommended && 'ring-1 ring-inset ring-border/40',
        plan.isCurrentPlan && 'border-border/80',
        !plan.recommended && !plan.isCurrentPlan && 'border-border/60',
      )}
    >
      <div className="px-2.5 py-2">
        <div className="flex items-start gap-1.5">
          <PlanIndexBadge plan={plan} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 flex flex-wrap items-center gap-1">
                <h4 className="text-xs font-semibold text-foreground leading-snug">{plan.title}</h4>
                {plan.recommended ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-4 px-1.5 text-[9px] font-medium',
                      workbenchDecisionCheckerBadgeClass('neutral'),
                    )}
                  >
                    推荐
                  </Badge>
                ) : null}
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{plan.code}</span>
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground line-clamp-2">{plan.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border/50 px-2.5 py-2">
        <div className="flex min-w-0 items-stretch divide-x divide-border/50">
          <PlanMetric label="安全性" value={plan.safetyLabel} valueClassName={safetyToneClass(plan.safetyLevel)} />
          <PlanMetric
            label="体验完整度"
            value={plan.experiencePercent != null ? `${plan.experiencePercent}%` : '—'}
            valueClassName={workbenchDecisionCheckerMetricValueClass('good')}
          />
          <PlanMetric
            label="时间影响"
            value={plan.timeImpact}
            valueClassName={workbenchDecisionCheckerMetricValueClass('bad')}
          />
        </div>
        {onApply && !plan.isCurrentPlan ? (
          <Button
            size="sm"
            variant={plan.recommended ? 'default' : 'outline'}
            className={cn(
              'h-7 w-full text-[10px] font-medium',
              plan.recommended && workbenchPrimaryAction,
            )}
            onClick={() => onApply(plan.id)}
          >
            应用 {plan.code}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

const contactIconClass: Record<ExecuteEmergencyContactKind, string> = {
  guide: 'bg-muted/40 text-muted-foreground',
  rescue: 'bg-muted/40 text-muted-foreground',
  insurance: 'bg-muted/40 text-muted-foreground',
};

function resolveContactKind(contact: ExecuteEmergencyContactModel): ExecuteEmergencyContactKind {
  if (contact.kind) return contact.kind;
  if (contact.id === 'guide') return 'guide';
  if (contact.id === 'rescue') return 'rescue';
  return 'insurance';
}

function ContactKindIcon({ kind }: { kind: ExecuteEmergencyContactKind }) {
  const iconClass = 'h-3.5 w-3.5';
  const icon =
    kind === 'guide' ? (
      <User className={iconClass} aria-hidden />
    ) : kind === 'rescue' ? (
      <LifeBuoy className={iconClass} aria-hidden />
    ) : (
      <Shield className={iconClass} aria-hidden />
    );

  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        contactIconClass[kind],
      )}
    >
      {icon}
    </span>
  );
}

export function ExecuteDecisionSidebar({
  tripId,
  advisory,
  fallbackPlan,
  onApplyPlan,
  onViewEvidence,
  onSos,
  className,
}: ExecuteDecisionSidebarProps) {
  const [tab, setTab] = useState('overview');
  const model = buildExecuteDecisionSidebarModel({ advisory, fallbackPlan });
  const overviewActive = tab === 'overview';
  const { insight: causalInsight, loading: causalInsightLoading } = useExecuteCausalInsight(
    tripId,
    advisory,
    { overviewTabActive: overviewActive, allowDemoFallback: false },
  );

  return (
    <aside className={cn('flex h-full min-h-0 flex-col gap-1.5', className)} data-section="execute-decision-sidebar">
      <section className={cn(workbenchCard, 'flex min-h-0 flex-1 flex-col overflow-hidden')}>
        <div className="shrink-0 border-b border-border/50 px-2.5 py-1.5">
          <h2 className={workbenchPanelTitle}>执行决策检查器</h2>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-[1.15] flex-col overflow-hidden">
          <TabsList
            className={cn(
              workbenchDecisionCheckerTabList,
              'mx-2.5 mt-1.5 w-auto shrink-0 justify-start overflow-x-auto border-b border-border/40 pb-0',
            )}
          >
            <TabsTrigger value="overview" className={workbenchDecisionCheckerTabTrigger}>
              概览
            </TabsTrigger>
            <TabsTrigger value="evidence" className={workbenchDecisionCheckerTabTrigger}>
              证据
            </TabsTrigger>
            <TabsTrigger value="impact" className={workbenchDecisionCheckerTabTrigger}>
              影响
            </TabsTrigger>
            <TabsTrigger value="planb" className={workbenchDecisionCheckerTabTrigger}>
              Plan B
              <Badge
                variant="outline"
                className={cn(
                  'ml-1 h-4 min-w-4 px-1 text-[9px]',
                  workbenchDecisionCheckerBadgeClass('neutral'),
                )}
              >
                {model.plans.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div
            className={cn(
              'shrink-0 overflow-y-auto px-2.5 pt-1.5 pb-2',
              workbenchScrollable,
              tab === 'overview' ? 'max-h-none min-h-[120px] flex-1' : 'max-h-28',
            )}
          >
            <TabsContent value="overview" className="mt-0">
              {causalInsight || causalInsightLoading ? (
                <ExecuteCausalInsightPanel insight={causalInsight} loading={causalInsightLoading} />
              ) : (
                <p className={workbenchEmptyHint}>
                  {advisory?.verdict.headline ?? '当前行程稳定，暂无需要关注的因果链。'}
                </p>
              )}
            </TabsContent>

            <TabsContent value="evidence" className="mt-0">
                {advisory?.deviations.length ? (
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {advisory.deviations.map((item) => (
                      <li key={item.id} className="flex gap-1.5">
                        <span className="text-foreground shrink-0">·</span>
                        <span>{item.message}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={workbenchEmptyHint}>阵风预计持续至 14:00，14:00 后改善概率 68%。</p>
                )}
                {advisory?.evidence.weatherAsOf ? (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    天气数据 {format(new Date(advisory.evidence.weatherAsOf), 'HH:mm')} 更新
                  </p>
                ) : null}
              </TabsContent>

              <TabsContent value="impact" className="mt-0">
                {advisory?.impacts.affectedItems.length ? (
                  <ul className="space-y-1.5">
                    {advisory.impacts.affectedItems.slice(0, 5).map((item) => (
                      <li key={item.itemId} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                          {item.status}
                        </Badge>
                        <span className="truncate text-foreground">{item.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={workbenchEmptyHint}>冰川徒步体验可能需延后或改线，集合时间暂保持不变。</p>
                )}
              </TabsContent>

              <TabsContent value="planb" className="mt-0">
                <p className="text-[11px] text-muted-foreground mb-2">
                  对比各 Plan B 的安全性、体验完整度与时间代价。
                </p>
              </TabsContent>
          </div>
        </Tabs>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/50">
          <p className="shrink-0 px-2 pt-1.5 text-[11px] font-semibold text-foreground">立即可执行的替代方案</p>
          <div className={cn('min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 pb-2 pt-1', workbenchScrollable)}>
            {model.plans.map((plan) => (
              <PlanBCard key={plan.id} plan={plan} onApply={onApplyPlan} />
            ))}
          </div>
        </div>
      </section>

      <section className={cn(workbenchCard, 'shrink-0 p-2')}>
        <h3 className={cn(workbenchPanelTitle, 'mb-1.5')}>紧急联系与支援</h3>
        <div className="flex gap-2">
          <ul className="min-w-0 flex-1 divide-y divide-border/60">
            {model.contacts.map((contact) => {
              const kind = resolveContactKind(contact);
              return (
                <li key={contact.id} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0 text-xs">
                  <ContactKindIcon kind={kind} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate leading-snug">
                      {contact.label}
                      {contact.subtitle ? (
                        <span className="font-normal text-muted-foreground"> {contact.subtitle}</span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums truncate leading-snug">
                      {contact.phone}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg border-border/70 text-foreground hover:bg-muted/40"
                    asChild
                  >
                    <a href={`tel:${contact.phone.replace(/\s/g, '')}`} aria-label={`拨打 ${contact.label}`}>
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center rounded-xl border-2 border-gate-reject-border bg-muted/15 text-gate-reject-foreground transition-colors hover:bg-muted/25"
            onClick={onSos}
          >
            <span className="text-[11px] font-semibold leading-none">紧急</span>
            <span className="mt-1 text-lg font-bold leading-none tracking-wide">SOS</span>
          </button>
        </div>
      </section>

      <section className={cn(workbenchCard, 'shrink-0 p-2')}>
        <div className="flex items-start gap-1.5 mb-1">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className={workbenchPanelTitle}>AI 实时建议</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">基于当前数据的推荐</p>
          </div>
        </div>
        <div className={workbenchDecisionCheckerAiBox}>
          <p className="text-[11px] leading-relaxed text-foreground">{model.aiSuggestion.primary}</p>
          {model.aiSuggestion.secondary ? (
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {model.aiSuggestion.secondary}
            </p>
          ) : null}
        </div>
        {onViewEvidence ? (
          <Button
            variant="link"
            className="mt-2 h-auto p-0 text-xs text-primary"
            onClick={onViewEvidence}
          >
            {model.aiSuggestion.evidenceLabel ?? '查看预测证据'}
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        ) : null}
      </section>
    </aside>
  );
}
