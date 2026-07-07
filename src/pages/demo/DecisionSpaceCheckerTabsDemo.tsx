import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DecisionWhatHappenedBanner } from '@/components/decision-problems/decision-execution-proposal/DecisionWhatHappenedBanner';
import { DecisionSpaceFeasibilityGatePanel } from '@/components/decision-problems/decision-space/DecisionSpaceFeasibilityGatePanel';
import { DecisionSpaceMembersConsensusPanel } from '@/components/decision-problems/decision-space/DecisionSpaceMembersConsensusPanel';
import { DecisionSpacePlanDiffPanel } from '@/components/decision-problems/decision-space/DecisionSpacePlanDiffPanel';
import { DECISION_EXECUTION_PROPOSAL_FIXTURE } from '@/lib/fixtures/decision-execution-proposal.fixtures';

/** 设计稿预览 · 决策检查器右侧四 Tab */
export default function DecisionSpaceCheckerTabsDemoPage() {
  const [tab, setTab] = useState('plan_diff');

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-md space-y-4">
        <header>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">决策检查器</h1>
          </div>
          <p className="mt-1 pl-6 text-sm text-muted-foreground">
            基于当前预测与原计划进行差异分析
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="causal">因果链</TabsTrigger>
            <TabsTrigger value="plan_diff">计划差异</TabsTrigger>
            <TabsTrigger value="members">成员共识</TabsTrigger>
            <TabsTrigger value="feasibility">可执行性</TabsTrigger>
          </TabsList>

          <TabsContent value="causal" className="mt-3">
            <DecisionWhatHappenedBanner text={DECISION_EXECUTION_PROPOSAL_FIXTURE.whatHappened} />
          </TabsContent>
          <TabsContent value="plan_diff" className="mt-3">
            <DecisionSpacePlanDiffPanel />
          </TabsContent>
          <TabsContent value="members" className="mt-3">
            <DecisionSpaceMembersConsensusPanel />
          </TabsContent>
          <TabsContent value="feasibility" className="mt-3">
            <DecisionSpaceFeasibilityGatePanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
