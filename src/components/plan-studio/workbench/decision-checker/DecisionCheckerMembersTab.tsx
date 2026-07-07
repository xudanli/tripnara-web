import type { PersonaAlert } from '@/types/trip';
import type { DecisionMemberImpact } from '@/types/decision-problem';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DecisionCheckerPersonaValidationStrip } from './DecisionCheckerPersonaValidationStrip';
import { DecisionCheckerEmpty, DecisionCheckerSection } from './decision-checker-ui';
import { workbenchCard } from '../workbench-ui';

export interface DecisionCheckerMembersTabProps {
  personaAlerts?: PersonaAlert[];
  memberImpacts?: DecisionMemberImpact[];
  selectedOptionLetter?: string;
  loading?: boolean;
  unavailable?: boolean;
  error?: string | null;
}

function MemberImpactRow({ impact }: { impact: DecisionMemberImpact }) {
  const isInferred = impact.derivedFrom?.toLowerCase().includes('infer');
  const name = impact.memberName?.trim() || '成员';

  return (
    <li className={cn(workbenchCard, 'px-3 py-2.5')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-xs font-medium text-foreground">{name}</p>
        {isInferred ? (
          <Badge variant="outline" className="h-4 rounded-full px-1.5 text-[10px] font-normal text-muted-foreground">
            推测 · 待确认
          </Badge>
        ) : null}
      </div>
      {impact.summary ? (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{impact.summary}</p>
      ) : null}
    </li>
  );
}

/** 决策检查器 · 成员意见 */
export function DecisionCheckerMembersTab({
  personaAlerts,
  memberImpacts,
  selectedOptionLetter = 'A',
  loading,
  unavailable,
  error,
}: DecisionCheckerMembersTabProps) {
  if (loading) {
    return <DecisionCheckerEmpty>正在加载成员意见…</DecisionCheckerEmpty>;
  }

  if (error) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (unavailable) {
    return <DecisionCheckerEmpty>成员意见接口尚未就绪。</DecisionCheckerEmpty>;
  }

  const hasMemberImpacts = (memberImpacts?.length ?? 0) > 0;
  const hasPersona = (personaAlerts?.length ?? 0) > 0;

  if (!hasMemberImpacts && !hasPersona) {
    return (
      <DecisionCheckerEmpty>
        暂无与当前决策相关的成员意见。成员在协作中心提交需求后，AI 将在此提炼决策相关立场。
      </DecisionCheckerEmpty>
    );
  }

  return (
    <div className="space-y-3">
      {hasMemberImpacts ? (
        <DecisionCheckerSection title="成员需求与立场">
          <ul className="space-y-1.5">
            {memberImpacts!.map((impact, index) => (
              <MemberImpactRow key={impact.memberId ?? `${impact.memberName}-${index}`} impact={impact} />
            ))}
          </ul>
        </DecisionCheckerSection>
      ) : null}

      {hasPersona ? (
        <DecisionCheckerSection
          title={hasMemberImpacts ? 'AI 委员会补充视角' : '成员意见'}
        >
          <DecisionCheckerPersonaValidationStrip
            personaAlerts={personaAlerts}
            selectedOptionLetter={selectedOptionLetter}
          />
        </DecisionCheckerSection>
      ) : null}
    </div>
  );
}
