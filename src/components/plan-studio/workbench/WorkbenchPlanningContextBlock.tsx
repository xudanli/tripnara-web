import { useMemo } from 'react';
import { ChevronRight, Lock, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  buildWorkbenchPlanningContextNarrative,
  buildWorkbenchPlanningContextSections,
} from '@/lib/workbench-planning-context.util';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { TripConstraintsContract } from '@/types/trip-constraints';
import type { WishSummary } from '@/types/trip-wishes';
import type { Collaborator, TripDetail } from '@/types/trip';
import { ConstraintSidebarSectionShell } from './ConstraintSidebarSectionShell';
import { workbenchPlanningContextShell } from './workbench-ui';

export interface WorkbenchPlanningContextBlockProps {
  trip?: TripDetail | null;
  budgetProfile?: TripBudgetProfile | null;
  contract?: TripConstraintsContract | null;
  wishSummary?: WishSummary | null;
  collaborators?: Collaborator[] | null;
  onOpenCollaborationCenter?: () => void;
  onOpenBudgetTab?: () => void;
  className?: string;
}

const SECTION_ICON = {
  trip: Users,
  team: Users,
  budget: Wallet,
  wishes: Lock,
} as const;

const PLANNING_CONTEXT_HELP =
  '除约束与冲突外，AI 也会参考这趟行程的团队、预算与成员想法来安排方案。';

/** 工作台左侧 · 行程规划上下文（团队 / 预算 / 想法） */
export function WorkbenchPlanningContextBlock({
  trip,
  budgetProfile,
  contract,
  wishSummary,
  collaborators,
  onOpenCollaborationCenter,
  onOpenBudgetTab,
  className,
}: WorkbenchPlanningContextBlockProps) {
  const sections = useMemo(
    () =>
      buildWorkbenchPlanningContextSections({
        trip,
        budgetProfile,
        contract,
        wishSummary,
        collaborators,
      }),
    [trip, budgetProfile, contract, wishSummary, collaborators],
  );

  const narrative = useMemo(() => buildWorkbenchPlanningContextNarrative(sections), [sections]);

  return (
    <ConstraintSidebarSectionShell
      sectionKey="planning_context"
      sidebarVariant="workbench"
      title="规划上下文"
      summary={narrative || undefined}
      helpText={PLANNING_CONTEXT_HELP}
      className={cn(workbenchPlanningContextShell, 'mb-3', className)}
    >
      {narrative ? (
        <p className="mb-2 rounded-lg border border-border/50 bg-muted/10 px-2.5 py-2 text-[11px] leading-relaxed text-foreground/90">
          {narrative}
        </p>
      ) : null}

      <div className="space-y-2">
        {sections.map((section) => {
          const Icon = SECTION_ICON[section.id] ?? Users;
          return (
            <div key={section.id} className="rounded-lg border border-border/45 bg-background/80 px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-[10px] font-semibold text-foreground">{section.title}</p>
              </div>
              <ul className="space-y-0.5">
                {section.lines.map((line) => (
                  <li key={line} className="text-[10px] leading-relaxed text-muted-foreground">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {onOpenCollaborationCenter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={onOpenCollaborationCenter}
          >
            团队与想法
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : null}
        {onOpenBudgetTab ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={onOpenBudgetTab}
          >
            预算详情
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : null}
      </div>
    </ConstraintSidebarSectionShell>
  );
}
