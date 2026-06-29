import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Vote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import type { UseDecisionCheckerResult } from '@/hooks/useDecisionChecker';
import type { UseSolutionMatrixModelResult } from '@/hooks/useSolutionMatrixModel';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  normalizeDecisionCheckerResponse,
  type DecisionCheckerScenarioDto,
} from '@/types/decision-checker';
import {
  DecisionCheckerBadge,
  DecisionCheckerMetricGrid,
  scenarioBadgeLabel,
  scenarioBorderClass,
} from './decision-checker/decision-checker-ui';
import { WorkbenchPersonaCommitteePanel } from './WorkbenchPersonaCommitteePanel';
import { WorkbenchTeamStancePanel } from './WorkbenchTeamStancePanel';
import type { PersonaAlert } from '@/types/trip';
import {
  workbenchCard,
  workbenchColumnSurface,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchSegmentIdle,
  workbenchSegmentSelected,
} from './workbench-ui';

const DECISION_CRITERIA = ['可行性', '预算', '体验', '体力', '团队支持'] as const;

export interface PlanningWorkbenchDecisionSpaceProps {
  tripId: string;
  conflict?: PlanningConflictItem | null;
  conflicts?: PlanningConflictItem[];
  decisionChecker?: UseDecisionCheckerResult;
  solutionMatrix?: UseSolutionMatrixModelResult;
  personaAlerts?: PersonaAlert[];
  memberCount?: number;
  onBack?: () => void;
  onSelectOption?: (optionId: string) => void;
  onInitiateNegotiation?: () => void;
  onInitiateVote?: () => void;
  onGenerateDraft?: () => void;
  onOpenCollaboration?: () => void;
  className?: string;
}

function buildMatrixScenarios(
  matrix: UseSolutionMatrixModelResult,
): DecisionCheckerScenarioDto[] {
  if (!matrix.model.visible) return [];
  const letters = ['A', 'B', 'C'];
  return matrix.model.columns.map((column, index) => {
    const rowValues = matrix.model.rows.slice(0, 3).flatMap((row) => {
      const cell = row.cells[index];
      if (!cell) return [];
      return [
        {
          key: `${column.optionId}-${row.dimensionId}`,
          label: row.label,
          displayValue: cell.displayValue,
          tone:
            cell.diffTone === 'better'
              ? ('good' as const)
              : cell.diffTone === 'worse'
                ? ('bad' as const)
                : ('neutral' as const),
        },
      ];
    });

    return {
      id: column.optionId,
      letter: letters[index],
      title: column.label,
      badge: column.isRecommended ? ('recommended' as const) : ('alternative' as const),
      badgeLabel: column.isRecommended ? '推荐' : undefined,
      description: column.caveat ?? '基于当前约束生成的替代方案。',
      variant: (index === 0 ? 'blue' : index === 1 ? 'orange' : 'purple') as
        | 'blue'
        | 'orange'
        | 'purple',
      metrics: rowValues,
    };
  });
}

/** 中间 · 决策空间（设计稿样式） */
export function PlanningWorkbenchDecisionSpace({
  tripId,
  conflict,
  conflicts = [],
  decisionChecker,
  solutionMatrix,
  personaAlerts,
  memberCount = 0,
  onBack,
  onSelectOption,
  onInitiateNegotiation,
  onInitiateVote,
  onGenerateDraft,
  onOpenCollaboration,
  className,
}: PlanningWorkbenchDecisionSpaceProps) {
  const [activeCriterion, setActiveCriterion] = useState<string>('可行性');

  const dc = decisionChecker ?? {
    data: null,
    loading: false,
    unavailable: false,
    error: null,
  };

  const data = normalizeDecisionCheckerResponse(dc.data, tripId);
  const loading = dc.loading;

  const scenarios = useMemo(() => {
    const fromChecker = data.counterfactual.scenarios ?? [];
    if (fromChecker.length >= 2) return fromChecker.slice(0, 3);
    if (solutionMatrix) {
      const fromMatrix = buildMatrixScenarios(solutionMatrix);
      if (fromMatrix.length >= 2) return fromMatrix;
    }
    if (data.overview.repairPlan) {
      const plan = data.overview.repairPlan;
      return [
        {
          id: plan.id,
          letter: 'A',
          title: plan.title,
          badge: 'recommended' as const,
          badgeLabel: plan.badge ?? '推荐',
          description: plan.description,
          variant: 'blue' as const,
          metrics: plan.metrics,
        },
      ];
    }
    return fromChecker;
  }, [data, solutionMatrix]);

  const selectedOptionId =
    solutionMatrix?.selectedOptionId ?? scenarios.find((s) => s.badge === 'recommended')?.id ?? scenarios[0]?.id;

  const selectedOptionLetter =
    scenarios.find((s) => s.id === selectedOptionId)?.letter ?? 'A';

  const conflictTitle =
    conflict?.title ??
    data.overview.conflict.primary?.title ??
    '路线修复决策';

  const conflictMessage =
    conflict?.message ??
    data.overview.conflict.primary?.message ??
    data.overview.aiSuggestion?.text;

  const dayLabel = useMemo(() => {
    const days = conflict?.affectedDays ?? data.overview.conflict.primary?.affectedDays;
    if (!days?.length) return null;
    if (days.length === 1) return `Day ${days[0]}`;
    return `Day ${days.join('、')}`;
  }, [conflict, data.overview.conflict.primary?.affectedDays]);

  const handleSelectScenario = (scenarioId: string) => {
    solutionMatrix?.setSelectedOptionId(scenarioId);
    solutionMatrix?.setExpanded(true);
    onSelectOption?.(scenarioId);
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col', workbenchColumnSurface, className)}>
      <div className={workbenchPanelHeader}>
        <div className="flex items-center gap-2">
          {onBack ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onBack}
              aria-label="返回行程分析"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className={workbenchPanelTitle}>决策空间</h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {dayLabel ? `${dayLabel} · ` : ''}
              {conflictTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {conflictMessage ? (
          <Alert variant="destructive" className="mb-3 rounded-xl border-gate-reject-border bg-gate-reject/20">
            <AlertTitle className="text-sm">问题说明</AlertTitle>
            <AlertDescription className="text-xs leading-relaxed">{conflictMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-3 flex flex-wrap gap-1.5">
          {DECISION_CRITERIA.map((criterion) => (
            <button
              key={criterion}
              type="button"
              onClick={() => setActiveCriterion(criterion)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                activeCriterion === criterion ? workbenchSegmentSelected : workbenchSegmentIdle,
              )}
            >
              {criterion}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-7 w-7" />
          </div>
        ) : scenarios.length === 0 ? (
          <div className={cn(workbenchCard, 'px-4 py-8 text-center')}>
            <p className="text-sm font-medium text-foreground">暂无可用修复方案</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              系统正在分析冲突，或需要先运行路线优化。请稍后重试，或通过决策检查器查看松弛建议。
            </p>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
            {scenarios.map((scenario) => {
              const selected = scenario.id === selectedOptionId;
              const badge = scenario.badgeLabel ?? scenarioBadgeLabel(scenario.badge);
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => handleSelectScenario(scenario.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all hover:brightness-[0.99]',
                    scenarioBorderClass(scenario.variant ?? 'blue'),
                    selected && 'ring-2 ring-primary/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          {scenario.letter ? `方案 ${scenario.letter}` : '方案'}
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">{scenario.title}</span>
                        {badge ? (
                          <DecisionCheckerBadge
                            tone={
                              scenario.badge === 'recommended'
                                ? 'success'
                                : scenario.badge === 'best'
                                  ? 'info'
                                  : 'warning'
                            }
                          >
                            {badge}
                          </DecisionCheckerBadge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                        {scenario.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <DecisionCheckerMetricGrid metrics={scenario.metrics} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {memberCount > 1 ? (
          <WorkbenchTeamStancePanel
            tripId={tripId}
            selectedOptionLetter={selectedOptionLetter}
            onOpenCollaboration={onOpenCollaboration}
            className="mb-3"
          />
        ) : null}

        <WorkbenchPersonaCommitteePanel
          personaAlerts={personaAlerts}
          className="min-h-[280px]"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/60 bg-card/80 px-3 py-3 sm:px-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-lg text-xs sm:flex-none"
          onClick={onInitiateNegotiation}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          发起协商
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-lg text-xs sm:flex-none"
          onClick={onInitiateVote}
        >
          <Vote className="mr-1.5 h-3.5 w-3.5" />
          发起投票
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn('h-9 flex-1 rounded-lg text-xs sm:flex-none sm:px-5', workbenchPrimaryAction)}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              生成方案草案
              <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={onGenerateDraft}>
              确认当前选中方案并生成草案
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBack}>返回行程分析</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
