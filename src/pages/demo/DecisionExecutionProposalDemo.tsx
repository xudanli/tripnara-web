import { DecisionExecutionProposalPanel } from '@/components/decision-problems/decision-execution-proposal/DecisionExecutionProposalPanel';
import { DECISION_EXECUTION_PROPOSAL_FIXTURE } from '@/lib/fixtures/decision-execution-proposal.fixtures';

/** 设计稿预览 · 决策执行提案中栏 */
export default function DecisionExecutionProposalDemoPage() {
  const fixture = DECISION_EXECUTION_PROPOSAL_FIXTURE;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <header>
          <h1 className="text-lg font-semibold text-foreground">决策执行提案 · 设计稿预览</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            发生了什么 → 决策依据 → 可选方案 A/B/C（蓝湖→教堂缓冲不足场景）
          </p>
        </header>
        <DecisionExecutionProposalPanel
          whatHappened={fixture.whatHappened}
          basisFacts={fixture.basisFacts}
          basisSubtitle={fixture.basisHint}
          options={fixture.options}
          selectedOptionId="opt-a"
        />
      </div>
    </div>
  );
}
