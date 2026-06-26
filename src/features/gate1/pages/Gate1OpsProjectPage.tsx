import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { LogoLoading } from '@/components/common/LogoLoading';
import {
  useCreateGate1CandidateDraft,
  useCreateGate1ConflictDraft,
  useCreateGate1PlanBDraft,
  useCreateGate1ReadinessDraft,
  useCreateGate1SanitizedConstraint,
  useGate1Project,
  usePublishGate1Candidate,
  usePublishGate1ConflictReport,
  usePublishGate1PlanB,
  usePublishGate1Readiness,
} from '@/hooks/useGate1';
import { resolveGate1UiErrorGuide } from '@/lib/gate1-errors';

export default function Gate1OpsProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useGate1Project(projectId);

  const createConflict = useCreateGate1ConflictDraft(projectId ?? '');
  const publishConflict = usePublishGate1ConflictReport(projectId ?? '');
  const createCandidate = useCreateGate1CandidateDraft(projectId ?? '');
  const publishCandidate = usePublishGate1Candidate(projectId ?? '');
  const createSanitized = useCreateGate1SanitizedConstraint(projectId ?? '');
  const createReadiness = useCreateGate1ReadinessDraft(projectId ?? '');
  const publishReadiness = usePublishGate1Readiness(projectId ?? '');
  const createPlanB = useCreateGate1PlanBDraft(projectId ?? '');
  const publishPlanB = usePublishGate1PlanB(projectId ?? '');

  const [humanMinutes, setHumanMinutes] = useState('90');
  const [conflictTitle, setConflictTitle] = useState('');
  const [conflictDesc, setConflictDesc] = useState('');
  const [conflictVersion, setConflictVersion] = useState<number | null>(null);

  const [candidateLabel, setCandidateLabel] = useState('');
  const [candidateSummary, setCandidateSummary] = useState('');
  const [candidateId, setCandidateId] = useState<string | null>(null);

  const [sanitizedExplanation, setSanitizedExplanation] = useState('');
  const [sanitizedImpact, setSanitizedImpact] = useState('');

  const [readinessTitle, setReadinessTitle] = useState('');
  const [readinessDesc, setReadinessDesc] = useState('');
  const [readinessVersion, setReadinessVersion] = useState<number | null>(null);

  const [planBLabel, setPlanBLabel] = useState('');
  const [planBRisk, setPlanBRisk] = useState('');
  const [planBTrigger, setPlanBTrigger] = useState('');
  const [planBAlternative, setPlanBAlternative] = useState('');
  const [planBId, setPlanBId] = useState<string | null>(null);

  if (isLoading || !projectId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LogoLoading size={36} />
      </div>
    );
  }

  const handleCreateConflict = async () => {
    if (!conflictTitle.trim() || !conflictDesc.trim()) {
      toast.error('请填写冲突标题与说明');
      return;
    }
    try {
      const report = await createConflict.mutateAsync({
        sourceType: 'HUMAN_ASSISTED',
        humanMinutes: Number(humanMinutes) || 90,
        findings: [
          {
            conflictType: 'budget',
            severity: 'HIGH',
            confidence: 'HIGH',
            source: 'member_input',
            baselineStatus: 'NEWLY_FOUND',
            title: conflictTitle.trim(),
            description: conflictDesc.trim(),
            resolutionDirection: 'budget_tiering',
            isBlocker: false,
          },
        ],
      });
      setConflictVersion(report.version ?? null);
      toast.success(`冲突草稿 v${report.version} 已创建`);
    } catch (e) {
      const guide = resolveGate1UiErrorGuide(e);
      toast.error(guide.description);
    }
  };

  const handlePublishConflict = async () => {
    if (conflictVersion == null) {
      toast.error('请先创建冲突草稿');
      return;
    }
    try {
      await publishConflict.mutateAsync({
        version: conflictVersion,
        body: { humanMinutes: Number(humanMinutes) || 90 },
      });
      toast.success('冲突报告已发布');
    } catch (e) {
      const guide = resolveGate1UiErrorGuide(e);
      toast.error(guide.description);
    }
  };

  const handleCreateCandidate = async () => {
    if (!candidateLabel.trim() || !candidateSummary.trim()) {
      toast.error('请填写方案标签与策略摘要');
      return;
    }
    try {
      const c = await createCandidate.mutateAsync({
        label: candidateLabel.trim(),
        strategySummary: candidateSummary.trim(),
        budgetSummary: '见顾问沟通',
        humanMinutes: Number(humanMinutes) || 120,
      });
      setCandidateId(c.id);
      toast.success('候选方案草稿已创建');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败');
    }
  };

  const handlePublishCandidate = async () => {
    if (!candidateId) {
      toast.error('请先创建候选方案');
      return;
    }
    try {
      await publishCandidate.mutateAsync({
        candidateId,
        body: { humanMinutes: Number(humanMinutes) || 120 },
      });
      toast.success('候选方案已发布');
    } catch (e) {
      const guide = resolveGate1UiErrorGuide(e);
      toast.error(guide.description);
    }
  };

  const handleSanitized = async () => {
    if (!sanitizedExplanation.trim()) {
      toast.error('请填写脱敏说明');
      return;
    }
    try {
      await createSanitized.mutateAsync({
        explanation: sanitizedExplanation.trim(),
        impactSummary: sanitizedImpact.trim() || undefined,
      });
      toast.success('脱敏约束已上传，待审核');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '上传失败');
    }
  };

  const handleCreateReadiness = async () => {
    if (!readinessTitle.trim() || !readinessDesc.trim()) {
      toast.error('请填写 Readiness finding 标题与说明');
      return;
    }
    try {
      const report = await createReadiness.mutateAsync({
        humanMinutes: Number(humanMinutes) || 60,
        findings: [
          {
            dimension: 'BOOKINGS',
            status: 'YELLOW',
            title: readinessTitle.trim(),
            description: readinessDesc.trim(),
            responsibleParty: 'advisor',
            isIncremental: true,
          },
        ],
      });
      setReadinessVersion(report.version ?? null);
      toast.success(`Readiness 草稿 v${report.version} 已创建`);
    } catch (e) {
      const guide = resolveGate1UiErrorGuide(e);
      toast.error(guide.description);
    }
  };

  const handlePublishReadiness = async () => {
    if (readinessVersion == null) {
      toast.error('请先创建 Readiness 草稿');
      return;
    }
    try {
      await publishReadiness.mutateAsync({
        version: readinessVersion,
        body: { humanMinutes: Number(humanMinutes) || 60 },
      });
      toast.success('Readiness 已发布');
    } catch (e) {
      const guide = resolveGate1UiErrorGuide(e);
      toast.error(guide.description);
    }
  };

  const handleCreatePlanB = async () => {
    if (!planBLabel.trim() || !planBRisk.trim() || !planBTrigger.trim() || !planBAlternative.trim()) {
      toast.error('请填写 Plan B 必填字段');
      return;
    }
    try {
      const p = await createPlanB.mutateAsync({
        label: planBLabel.trim(),
        riskTitle: planBRisk.trim(),
        triggerCondition: planBTrigger.trim(),
        alternativeSummary: planBAlternative.trim(),
        humanMinutes: Number(humanMinutes) || 45,
      });
      setPlanBId(p.id);
      toast.success('Plan B 草稿已创建');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败');
    }
  };

  const handlePublishPlanB = async () => {
    if (!planBId) {
      toast.error('请先创建 Plan B');
      return;
    }
    try {
      await publishPlanB.mutateAsync({
        planBId,
        body: { humanMinutes: Number(humanMinutes) || 45 },
      });
      toast.success('Plan B 已发布');
    } catch (e) {
      const guide = resolveGate1UiErrorGuide(e);
      toast.error(guide.description);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/ops/gate1"
          title={project?.title ?? '运营工作台'}
          subtitle="人工协助 · 上传与发布"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/dashboard/gate1/projects/${projectId}`}>顾问视图</Link>
        </Button>

        <div className="space-y-2">
          <Label htmlFor="ops-minutes">人工工时（分钟）</Label>
          <Input
            id="ops-minutes"
            type="number"
            className="max-w-xs"
            value={humanMinutes}
            onChange={(e) => setHumanMinutes(e.target.value)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">脱敏约束</CardTitle>
            <CardDescription>存在私密约束时，须先审核通过才能发布冲突/方案</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="脱敏说明（不得含姓名、诊断、精确预算）"
              value={sanitizedExplanation}
              onChange={(e) => setSanitizedExplanation(e.target.value)}
            />
            <Input
              placeholder="影响摘要（可选）"
              value={sanitizedImpact}
              onChange={(e) => setSanitizedImpact(e.target.value)}
            />
            <Button onClick={() => void handleSanitized()}>上传脱敏约束</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">冲突报告</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="冲突标题"
              value={conflictTitle}
              onChange={(e) => setConflictTitle(e.target.value)}
            />
            <Textarea
              placeholder="脱敏后说明"
              value={conflictDesc}
              onChange={(e) => setConflictDesc(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleCreateConflict()}>
                创建草稿
              </Button>
              <Button onClick={() => void handlePublishConflict()}>发布 v{conflictVersion ?? '?'}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">候选方案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="方案标签"
              value={candidateLabel}
              onChange={(e) => setCandidateLabel(e.target.value)}
            />
            <Textarea
              placeholder="策略摘要"
              value={candidateSummary}
              onChange={(e) => setCandidateSummary(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleCreateCandidate()}>
                创建草稿
              </Button>
              <Button onClick={() => void handlePublishCandidate()}>发布方案</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readiness</CardTitle>
            <CardDescription>发布前须关闭所有 RED finding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Finding 标题"
              value={readinessTitle}
              onChange={(e) => setReadinessTitle(e.target.value)}
            />
            <Textarea
              placeholder="说明与证据"
              value={readinessDesc}
              onChange={(e) => setReadinessDesc(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleCreateReadiness()}>
                创建草稿
              </Button>
              <Button onClick={() => void handlePublishReadiness()}>
                发布 v{readinessVersion ?? '?'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan B</CardTitle>
            <CardDescription>仅针对有事实依据的高影响风险</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="标签"
              value={planBLabel}
              onChange={(e) => setPlanBLabel(e.target.value)}
            />
            <Input
              placeholder="风险标题"
              value={planBRisk}
              onChange={(e) => setPlanBRisk(e.target.value)}
            />
            <Input
              placeholder="可观察触发条件"
              value={planBTrigger}
              onChange={(e) => setPlanBTrigger(e.target.value)}
            />
            <Textarea
              placeholder="替代方案摘要"
              value={planBAlternative}
              onChange={(e) => setPlanBAlternative(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleCreatePlanB()}>
                创建草稿
              </Button>
              <Button onClick={() => void handlePublishPlanB()}>发布 Plan B</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
