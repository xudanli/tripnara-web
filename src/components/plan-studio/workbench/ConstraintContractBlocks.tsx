import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { coerceDisplayText } from '@/lib/coerce-display-text.util';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import {
  CHANGE_STRATEGY_ARCHETYPE_OPTIONS,
  changeStrategyArchetypeLabel,
  mergeTeamGovernanceDecisionRule,
  parseGovernanceModeFromContractRules,
  readBudgetOverrunTolerancePct,
  toleranceFieldLabel,
} from '@/lib/trip-constraints-contract.util';
import { buildTripAutomationAuthorizationPath } from '@/lib/travel-status-navigation.util';
import AutomationCatalogSummaryPanel, {
  hasAutomationCatalogSummary,
  resolveAutomationSidebarSummary,
} from '@/components/trip-automation/AutomationCatalogSummaryPanel';
import type { TravelStatusAutomation } from '@/api/travel-status.types';
import { GOVERNANCE_MODE_META, type TeamGovernanceMode } from '@/lib/team-tab-model';
import { resolveTeamMembersSidebarSummary } from '@/lib/constraint-scope-options.util';
import type { TripDetail } from '@/types/trip';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Bot, Shield, Users } from 'lucide-react';
import { workbenchLinkClass } from './workbench-ui';
import type {
  PatchTripConstraintsContractDto,
  TripConstraintsChangeStrategy,
  TripConstraintsContract,
  TripConstraintsContractBlockType,
} from '@/types/trip-constraints';
import type { ChangeStrategyArchetype } from '@/types/travel-decision-contract';
import { ConstraintSidebarListRow } from './ConstraintSidebarListRow';

function ContractBlockShell({
  title,
  children,
  className,
  onSelect,
  selected,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const body = (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-2 text-left',
        selected ? 'border-foreground/15 bg-muted/50 ring-1 ring-foreground/8' : 'border-border/45 bg-muted/8',
        onSelect && 'cursor-pointer hover:bg-muted/20',
        className,
      )}
    >
      {children}
    </div>
  );
  if (!onSelect) return body;
  return (
    <button type="button" className="w-full" onClick={onSelect}>
      {body}
    </button>
  );
}

export interface ContractSectionSidebarPreviewProps {
  sectionKey: string;
  contractBlock: TripConstraintsContractBlockType;
  label: string;
  contract?: TripConstraintsContract | null;
  trip?: TripDetail | null;
  memberConstraintItems?: readonly unknown[];
  automationSummary?: TravelStatusAutomation | null;
  selected?: boolean;
  onSelect?: () => void;
  /** 侧栏摘要：不重复展示章节标题 */
  compact?: boolean;
}

/** 侧栏 · contract 区块摘要（无 constraint 卡片） */
export function ContractSectionSidebarPreview({
  contractBlock,
  label,
  contract,
  trip,
  memberConstraintItems,
  automationSummary,
  selected,
  onSelect,
  compact = false,
}: ContractSectionSidebarPreviewProps) {
  if (compact) {
    switch (contractBlock) {
      case 'team_governance': {
        const description = resolveTeamMembersSidebarSummary({
          contract,
          trip,
          memberConstraintItems,
        });
        return (
          <ConstraintSidebarListRow
            icon={Users}
            label={label}
            showLabel={false}
            description={description}
            selected={selected}
            onSelect={onSelect}
          />
        );
      }
      case 'change_strategy':
        return (
          <ConstraintSidebarListRow
            icon={Shield}
            label={label}
            showLabel={false}
            description={changeStrategyArchetypeLabel(contract?.changeStrategy?.archetype ?? 'BALANCED')}
            selected={selected}
            onSelect={onSelect}
          />
        );
      case 'automation': {
        const description = resolveAutomationSidebarSummary(automationSummary);
        return (
          <ConstraintSidebarListRow
            icon={Bot}
            label={label}
            showLabel={false}
            description={description}
            selected={selected}
            onSelect={onSelect}
          />
        );
      }
      case 'conflicts': {
        const count = contract?.conflicts?.items?.length ?? 0;
        const score = contract?.conflicts?.feasibilityScore;
        return (
          <ConstraintSidebarListRow
            icon={AlertTriangle}
            label={label}
            showLabel={false}
            description={
              count > 0
                ? `${count} 项冲突${score != null ? ` · 可执行性 ${Math.round(score)}` : ''}`
                : `暂无冲突${score != null ? ` · 可执行性 ${Math.round(score)}` : ''}`
            }
            selected={selected}
            onSelect={onSelect}
          />
        );
      }
      default:
        return null;
    }
  }

  switch (contractBlock) {
    case 'team_governance': {
      const description = resolveTeamMembersSidebarSummary({
        contract,
        trip,
        memberConstraintItems,
      });
      return (
        <ContractBlockShell title={label} selected={selected} onSelect={onSelect}>
          {!compact ? <p className="text-[10px] font-semibold text-foreground">{label}</p> : null}
          <p className={cn('text-[11px] text-muted-foreground', !compact && 'mt-0.5')}>
            {description}
          </p>
        </ContractBlockShell>
      );
    }
    case 'change_strategy':
      return (
        <ContractBlockShell title={label} selected={selected} onSelect={onSelect}>
          {!compact ? <p className="text-[10px] font-semibold text-foreground">{label}</p> : null}
          <p className={cn('text-[11px] text-muted-foreground', !compact && 'mt-0.5')}>
            {changeStrategyArchetypeLabel(contract?.changeStrategy?.archetype ?? 'BALANCED')}
          </p>
        </ContractBlockShell>
      );
    case 'automation': {
      const description = resolveAutomationSidebarSummary(automationSummary);
      return (
        <ContractBlockShell title={label} selected={selected} onSelect={onSelect}>
          <p className="text-[10px] font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground">{description}</p>
        </ContractBlockShell>
      );
    }
    case 'conflicts': {
      const count = contract?.conflicts?.items?.length ?? 0;
      const score = contract?.conflicts?.feasibilityScore;
      return (
        <ContractBlockShell title={label} selected={selected} onSelect={onSelect}>
          <p className="text-[10px] font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            {count > 0 ? `${count} 项冲突` : '暂无冲突'}
            {score != null ? ` · 可执行性 ${Math.round(score)}` : ''}
          </p>
        </ContractBlockShell>
      );
    }
    default:
      return null;
  }
}

export interface ContractSectionDetailPanelProps {
  sectionKey: string;
  contract?: TripConstraintsContract | null;
  tripId?: string;
  automationSummary?: TravelStatusAutomation | null;
  onRunCheck?: () => void;
  /** BFF 可用时可编辑 contract 字段 */
  contractEditable?: boolean;
  contractSaving?: boolean;
  onPatchContract?: (patch: PatchTripConstraintsContractDto) => void | Promise<void>;
  onOpenCollaborationCenter?: () => void;
  className?: string;
}

function ContractOptionCard({
  value,
  id,
  title,
  description,
  selected,
}: {
  value: string;
  id: string;
  title: string;
  description: string;
  selected?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
        selected ? 'border-primary/35 bg-primary/5' : 'border-border/60 hover:bg-muted/20',
      )}
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

/** 右栏 · contract 区块详情 */
export function ContractSectionDetailPanel({
  sectionKey,
  contract,
  tripId,
  automationSummary,
  onRunCheck,
  contractEditable = false,
  contractSaving = false,
  onPatchContract,
  onOpenCollaborationCenter,
  className,
}: ContractSectionDetailPanelProps) {
  const navigate = useNavigate();
  const changeStrategy = contract?.changeStrategy;
  const effectiveArchetype = changeStrategy?.archetype ?? 'BALANCED';
  const budgetTolerancePct = readBudgetOverrunTolerancePct(changeStrategy?.tolerances) ?? 5;
  const [budgetToleranceDraft, setBudgetToleranceDraft] = useState<number | null>(null);
  const displayedBudgetTolerance = budgetToleranceDraft ?? budgetTolerancePct;

  useEffect(() => {
    setBudgetToleranceDraft(null);
  }, [effectiveArchetype, budgetTolerancePct]);

  const patchChangeStrategy = (patch: TripConstraintsChangeStrategy) => {
    void onPatchContract?.({ changeStrategy: patch });
  };

  const handleArchetypeChange = (value: string) => {
    patchChangeStrategy({
      ...changeStrategy,
      archetype: value as ChangeStrategyArchetype,
    });
  };

  const handleBudgetToleranceChange = (values: number[]) => {
    const next = values[0] ?? displayedBudgetTolerance;
    setBudgetToleranceDraft(null);
    patchChangeStrategy({
      ...changeStrategy,
      tolerances: {
        ...(changeStrategy?.tolerances ?? {}),
        maxBudgetOverrunPct: next,
      },
    });
  };

  const otherTolerances = Object.entries(changeStrategy?.tolerances ?? {}).filter(
    ([key]) => key !== 'maxBudgetOverrunPct',
  );

  const governanceMode =
    parseGovernanceModeFromContractRules(contract?.teamGovernance?.rules) ?? 'leader';

  const handleGovernanceModeChange = (mode: TeamGovernanceMode) => {
    void onPatchContract?.({
      teamGovernance: {
        ...contract?.teamGovernance,
        rules: mergeTeamGovernanceDecisionRule(contract?.teamGovernance?.rules, mode),
      },
    });
  };

  const otherGovernanceRules = (contract?.teamGovernance?.rules ?? []).filter(
    (rule) => rule.key !== 'decision_weight_mode',
  );

  return (
    <div className={cn('flex h-full flex-col overflow-y-auto', className)}>
      <div className="mx-auto w-full max-w-xl flex-1 p-4">
      {sectionKey === 'team_members' || sectionKey === 'team_governance' ? (
        <>
          <h3 className="text-sm font-semibold">团队成员与决策权限</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            多人旅行时的个体限制与治理规则。成员画像在团队协作中心维护。
          </p>

          {contractEditable && onPatchContract ? (
            <div className="mt-4">
              <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                决策方式
              </Label>
              <RadioGroup
                value={governanceMode}
                onValueChange={(value) => handleGovernanceModeChange(value as TeamGovernanceMode)}
                disabled={contractSaving}
                className="mt-2 gap-2"
              >
                {(Object.keys(GOVERNANCE_MODE_META) as TeamGovernanceMode[]).map((mode) => {
                  const meta = GOVERNANCE_MODE_META[mode];
                  return (
                    <ContractOptionCard
                      key={mode}
                      value={mode}
                      id={`team-governance-${mode}`}
                      title={`${meta.icon} ${meta.label}`}
                      description={meta.description}
                      selected={governanceMode === mode}
                    />
                  );
                })}
              </RadioGroup>
            </div>
          ) : null}

          {(contract?.teamGovernance?.members ?? []).length > 0 ? (
            <ul className="mt-4 space-y-2">
              {contract!.teamGovernance!.members!.map((member) => (
                <li key={member.id} className="rounded-lg border border-border/60 px-3 py-2 text-xs">
                  <p className="font-medium">{member.name ?? member.id}</p>
                  {member.role ? <p className="text-muted-foreground">{member.role}</p> : null}
                  {member.constraintsSummary ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{member.constraintsSummary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">暂无成员画像。</p>
          )}

          {otherGovernanceRules.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                其他决策规则
              </p>
              <ul className="mt-2 space-y-1.5">
                {otherGovernanceRules.map((rule, index) => (
                  <li key={rule.key ?? index} className="text-[11px]">
                    <span className="font-medium text-foreground">{rule.label}</span>
                    {rule.description && !rule.description.startsWith('mode:') ? (
                      <span className="text-muted-foreground"> — {rule.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {onOpenCollaborationCenter ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 h-8 gap-1.5 text-xs"
              onClick={onOpenCollaborationCenter}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              前往团队协作中心
            </Button>
          ) : null}

          {contractSaving ? (
            <p className="mt-2 text-[10px] text-muted-foreground">正在保存…</p>
          ) : null}
        </>
      ) : null}

      {sectionKey === 'change_strategy' ? (
        <>
          <h3 className="text-sm font-semibold">风险与变化策略</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            决定行程变化时系统有多激进，以及可接受的偏差范围。
          </p>

          {contractEditable && onPatchContract ? (
            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  变化风格
                </Label>
                <RadioGroup
                  value={effectiveArchetype}
                  onValueChange={handleArchetypeChange}
                  disabled={contractSaving}
                  className="mt-2 gap-2"
                >
                  {CHANGE_STRATEGY_ARCHETYPE_OPTIONS.map((option) => (
                    <ContractOptionCard
                      key={option.value}
                      value={option.value}
                      id={`change-strategy-${option.value}`}
                      title={option.label}
                      description={option.description}
                      selected={effectiveArchetype === option.value}
                    />
                  ))}
                </RadioGroup>
              </div>

              <div className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="budget-overrun-tolerance" className="text-xs font-medium">
                    {toleranceFieldLabel('maxBudgetOverrunPct')}
                  </Label>
                  <span className="text-xs font-semibold tabular-nums">{displayedBudgetTolerance}%</span>
                </div>
                <Slider
                  id="budget-overrun-tolerance"
                  min={0}
                  max={30}
                  step={1}
                  value={[displayedBudgetTolerance]}
                  onValueChange={(values) => setBudgetToleranceDraft(values[0] ?? displayedBudgetTolerance)}
                  onValueCommit={handleBudgetToleranceChange}
                  disabled={contractSaving}
                  className="mt-3"
                />
                <p className="mt-2 text-[10px] text-muted-foreground">
                  允许总预算超出原计划的上限百分比；超出后触发决策提醒。
                </p>
              </div>

              {otherTolerances.length > 0 ? (
                <dl className="space-y-2 text-xs">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    其他容忍度
                  </p>
                  {otherTolerances.map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{toleranceFieldLabel(key)}</dt>
                      <dd className="font-medium tabular-nums">
                        {typeof value === 'boolean' ? (value ? '是' : '否') : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {contractSaving ? (
                <p className="text-[10px] text-muted-foreground">正在保存…</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  已选：{changeStrategyArchetypeLabel(effectiveArchetype)} · 变更会立即写入决策合同
                </p>
              )}
            </div>
          ) : (
            <>
              <Badge variant="outline" className="mt-2 w-fit">
                {changeStrategyArchetypeLabel(effectiveArchetype)}
              </Badge>
              {changeStrategy?.tolerances ? (
                <dl className="mt-4 space-y-2 text-xs">
                  {Object.entries(changeStrategy.tolerances).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{toleranceFieldLabel(key)}</dt>
                      <dd className="font-medium tabular-nums">
                        {key === 'maxBudgetOverrunPct' ? `${String(value)}%` : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">尚未配置具体容忍度。</p>
              )}
            </>
          )}
        </>
      ) : null}

      {sectionKey === 'automation' ? (
        hasAutomationCatalogSummary(automationSummary) ? (
          <>
            <h3 className="text-sm font-semibold">AI 自动执行授权（摘要）</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              以下摘要来自 travel-status catalog；档位与细项权限请在授权中心维护。
            </p>

            <AutomationCatalogSummaryPanel automation={automationSummary!} className="mt-4" />

            {tripId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 h-8 gap-1.5 text-xs"
                onClick={() => navigate(buildTripAutomationAuthorizationPath(tripId))}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                前往 AI 授权中心调整
              </Button>
            ) : null}
          </>
        ) : null
      ) : null}

      {sectionKey === 'conflicts_and_impact' ? (
        <>
          <h3 className="text-sm font-semibold">冲突沙盘</h3>
          {contract?.conflicts?.summary ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{contract.conflicts.summary}</p>
          ) : null}
          {contract?.conflicts?.feasibilityScore != null ? (
            <p className="mt-2 text-xs">
              当前可执行性：
              <span className="ml-1 font-semibold tabular-nums">
                {Math.round(contract.conflicts.feasibilityScore)}
              </span>
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {(contract?.conflicts?.items ?? []).map((item, index) => (
              <li
                key={item.id ?? index}
                className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-[11px]"
              >
                <p className="font-medium text-foreground">
                  {coerceDisplayText(item.message) ?? '未命名冲突'}
                </p>
                {item.suggestedResolution ? (
                  <p className="mt-1 text-muted-foreground">
                    {coerceDisplayText(item.suggestedResolution)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {onRunCheck ? (
            <button
              type="button"
              className={cn('mt-4 text-xs', workbenchLinkClass)}
              onClick={onRunCheck}
            >
              运行完整约束检查 →
            </button>
          ) : null}
        </>
      ) : null}
      </div>
    </div>
  );
}
