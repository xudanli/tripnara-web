import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionMemberImpact } from '@/types/decision-problem';
import {
  type MemberConsensusItemView,
  type MembersConsensusTabView,
} from '@/lib/fixtures/decision-space-checker-tabs.fixtures';
import { DecisionCheckerEmpty } from '@/components/plan-studio/workbench/decision-checker/decision-checker-ui';

const STANCE_CLASS = {
  support: 'border-gate-allow-border/60 bg-gate-allow/10 text-gate-allow-foreground',
  neutral: 'border-border/60 bg-muted/10 text-muted-foreground',
  concern: 'border-gate-confirm-border/60 bg-gate-confirm/10 text-gate-confirm-foreground',
} as const;

function memberFromImpact(impact: DecisionMemberImpact): MemberConsensusItemView {
  const inferred = impact.derivedFrom?.toLowerCase().includes('infer');
  const text = impact.summary?.toLowerCase() ?? '';
  const stance: MemberConsensusItemView['stance'] =
    text.includes('反对') || text.includes('不可') ? 'concern' : 'support';
  return {
    id: impact.memberId ?? impact.memberName ?? 'member',
    name: impact.memberName?.trim() || '成员',
    stance,
    stanceLabel: stance === 'support' ? '可接受' : stance === 'concern' ? '有顾虑' : '中立',
    summary: impact.summary?.trim() || '暂无补充说明',
    inferred,
  };
}

function buildMembersView(input: {
  memberImpacts?: DecisionMemberImpact[];
  optionLetter?: string;
}): MembersConsensusTabView | null {
  if (!input.memberImpacts?.length) return null;
  const members = input.memberImpacts.map(memberFromImpact);
  const supportCount = members.filter((m) => m.stance === 'support').length;
  return {
    optionLetter: input.optionLetter ?? 'A',
    consensusLabel: supportCount === members.length ? '倾向一致' : '存在分歧',
    consensusSummary: `共 ${members.length} 位成员与当前方案相关；${supportCount} 位可接受。`,
    supportCount,
    totalCount: members.length,
    members,
  };
}

export interface DecisionSpaceMembersConsensusPanelProps {
  memberImpacts?: DecisionMemberImpact[];
  optionLetter?: string;
  loading?: boolean;
  error?: string | null;
  /** decision-inspector.memberConsensus 已适配的视图 */
  inspectorView?: MembersConsensusTabView | null;
  tabEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
}

/** 决策检查器 · 成员共识 Tab */
export function DecisionSpaceMembersConsensusPanel({
  memberImpacts,
  optionLetter = 'A',
  loading,
  error,
  inspectorView,
  tabEmpty = false,
  emptyMessage,
  className,
}: DecisionSpaceMembersConsensusPanelProps) {
  const view = useMemo(() => {
    if (tabEmpty) return null;
    return inspectorView ?? buildMembersView({ memberImpacts, optionLetter });
  }, [tabEmpty, inspectorView, memberImpacts, optionLetter]);

  if (loading && !view && !tabEmpty) {
    return <DecisionCheckerEmpty>正在加载成员共识…</DecisionCheckerEmpty>;
  }

  if (error) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (tabEmpty || !view?.members.length) {
    return (
      <DecisionCheckerEmpty className={className}>
        {emptyMessage ?? '选定方案后可查看成员共识。'}
      </DecisionCheckerEmpty>
    );
  }

  return (
    <div className={cn('space-y-2 rounded-lg border border-border/60 bg-card p-2', className)}>
      <section className="rounded-md border border-border/60 bg-muted/5 px-2 py-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-snug text-foreground">
              方案 {view.optionLetter} · {view.consensusLabel}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {view.consensusSummary}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border/50 bg-muted/10 px-1.5 py-0.5 text-[9px] text-muted-foreground">
            <Users className="h-3 w-3" />
            {view.supportCount}/{view.totalCount}
          </div>
        </div>
      </section>

      <ul className="space-y-1.5">
        {view.members.map((member) => (
          <li key={member.id} className="rounded-md border border-border/60 bg-muted/5 px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[11px] font-semibold text-foreground">{member.name}</p>
              <span
                className={cn(
                  'rounded-full border px-1.5 py-px text-[9px] font-medium',
                  STANCE_CLASS[member.stance],
                )}
              >
                {member.stanceLabel}
              </span>
              {member.inferred ? (
                <span className="text-[9px] text-muted-foreground">推测 · 待确认</span>
              ) : null}
            </div>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{member.summary}</p>
          </li>
        ))}
      </ul>

      {view.aiNote ? (
        <footer className="rounded-md border border-border/50 bg-muted/10 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
          {view.aiNote}
        </footer>
      ) : null}
    </div>
  );
}
