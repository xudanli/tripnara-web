import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { FitReassessmentBanner } from '../components/FitReassessmentBanner';
import { FitAssessmentDocumentsPanel } from '../components/FitAssessmentDocumentsPanel';
import { ProjectFitQuestionnaire, buildAnswersFromQuestionnaire } from '../components/ProjectFitQuestionnaire';
import { ProjectFitReportPanel } from '../components/ProjectFitReportPanel';
import { ProjectFitResultBadge } from '../components/ProjectFitResultBadge';
import { useTrustedProject } from '@/hooks/useTrustedProjects';
import {
  useEligibilityRules,
  useEvaluateFitAssessment,
  useFitAssessmentReport,
  useFitAssessmentStatus,
  useFitQuestionnaire,
  useSaveFitAnswers,
  useStartFitAssessment,
  useSubmitApplicationWithFit,
  useFitAssessmentDocuments,
} from '@/hooks/useProjectFit';
import { canSubmitApplicationWithFit, assessmentRequiresDocuments, hasAcceptableFitDocuments } from '@/lib/project-fit-display';
import { validateRequiredFitAnswers } from '@/lib/normalize-fit-questionnaire';
import type { FitAssessmentAnswer } from '@/types/project-fit';

type Step = 'intro' | 'questionnaire' | 'report' | 'apply';

export default function ProjectFitAssessmentPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading, isError: projectError } = useTrustedProject(listingId);
  const { data: rules, isLoading: rulesLoading } = useEligibilityRules(listingId);
  const { data: fitStatus, isLoading: statusLoading } = useFitAssessmentStatus(listingId);
  const { data: questionnaire, isLoading: questionnaireLoading } = useFitQuestionnaire(
    listingId,
    'full'
  );

  const [step, setStep] = useState<Step>('intro');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<FitAssessmentAnswer[]>([]);
  const [message, setMessage] = useState('');

  const startAssessment = useStartFitAssessment(listingId ?? '');
  const saveAnswers = useSaveFitAnswers(assessmentId ?? '');
  const evaluate = useEvaluateFitAssessment(assessmentId ?? '', listingId);
  const submitApp = useSubmitApplicationWithFit(listingId ?? '');

  const { data: report, isLoading: reportLoading } = useFitAssessmentReport(
    assessmentId ?? undefined,
    'applicant'
  );

  const questions = questionnaire?.questions ?? [];
  const documentRequired = assessmentRequiresDocuments(rules);
  const { data: documents } = useFitAssessmentDocuments(assessmentId ?? undefined);

  const handleStart = async () => {
    if (!listingId) return;
    if (fitStatus?.needsReassessment || !fitStatus?.assessment) {
      try {
        const assessment = await startAssessment.mutateAsync();
        setAssessmentId(assessment.id);
        setStep('questionnaire');
      } catch {
        toast.error('无法开始评估，请稍后重试');
      }
      return;
    }
    if (fitStatus.assessment.status === 'COMPLETED') {
      setAssessmentId(fitStatus.assessment.id);
      setStep('report');
      return;
    }
    setAssessmentId(fitStatus.assessment.id);
    setStep('questionnaire');
  };

  const handleEvaluate = async () => {
    if (!assessmentId) return;
    const payload = buildAnswersFromQuestionnaire(answers);
    const { valid, missingLabels } = validateRequiredFitAnswers(questions, payload);
    if (!valid) {
      toast.error(`请完成必填项：${missingLabels.join('、')}`);
      return;
    }
    if (documentRequired && !hasAcceptableFitDocuments(documents)) {
      toast.error('规则要求证件材料，请先上传并完成 OCR 识别');
      return;
    }
    try {
      await saveAnswers.mutateAsync(payload);
      await evaluate.mutateAsync();
      setStep('report');
    } catch {
      toast.error('评估失败，请检查答案后重试');
    }
  };

  const handleApply = async () => {
    if (!assessmentId || !report) return;
    if (!canSubmitApplicationWithFit(report.overallResult)) {
      toast.error('当前评估为「暂不推荐」，无法提交申请');
      return;
    }
    try {
      const app = await submitApp.mutateAsync({
        fitAssessmentId: assessmentId,
        message: message.trim() || undefined,
      });
      toast.success('申请已提交，进入审核');
      navigate(`/dashboard/project-fit/applications/${app.id}`);
    } catch {
      toast.error('提交失败：评估可能已过期或与当前规则版本不一致');
    }
  };

  const loading = projectLoading || rulesLoading || statusLoading;

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={`/dashboard/trusted-projects/${listingId}`}
          title="测一测是否适合"
          subtitle={project?.title}
          maxWidth="full"
        />
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        {loading && (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        )}

        {!loading && projectError && (
          <p className="py-12 text-center text-sm text-muted-foreground">项目不存在或已下架</p>
        )}

        {fitStatus && (
          <FitReassessmentBanner status={fitStatus} onRestart={() => void handleStart()} />
        )}

        {step === 'intro' && project && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">项目适合度评估</CardTitle>
              <CardDescription>
                动态问卷 · 四档结论 · 无综合信用分
                {questionnaire?.ruleVersion != null && ` · 规则 v${questionnaire.ruleVersion}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(rules ?? []).length > 0 && (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {rules!.map((rule) => (
                    <li key={rule.id} className="rounded-lg border px-3 py-2">
                      {rule.explanationTemplate ?? rule.conditionKey}
                    </li>
                  ))}
                </ul>
              )}
              <Button onClick={() => void handleStart()} disabled={startAssessment.isPending}>
                {startAssessment.isPending
                  ? '准备中…'
                  : fitStatus?.assessment?.status === 'COMPLETED' && !fitStatus.needsReassessment
                    ? '查看上次报告'
                    : '开始评估'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'questionnaire' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">适合度问卷</CardTitle>
              <CardDescription>带 * 为必填；高敏感字段领队侧脱敏</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionnaireLoading ? (
                <LogoLoading size={28} />
              ) : (
                <ProjectFitQuestionnaire questions={questions} onChange={setAnswers} />
              )}
              {assessmentId && (
                <FitAssessmentDocumentsPanel assessmentId={assessmentId} required={documentRequired} />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('intro')}>
                  返回
                </Button>
                <Button
                  onClick={() => void handleEvaluate()}
                  disabled={saveAnswers.isPending || evaluate.isPending}
                >
                  {evaluate.isPending ? '评估中…' : '查看适合度报告'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'report' && (
          <>
            {reportLoading && <LogoLoading size={32} />}
            {report && (
              <>
                <ProjectFitReportPanel report={report} role="applicant" />
                {canSubmitApplicationWithFit(report.overallResult) ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">正式申请</CardTitle>
                      <CardDescription>提交后进入 UNDER_REVIEW，需与当前规则版本一致</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="补充说明（可选）"
                        rows={3}
                      />
                      <Button
                        onClick={() => void handleApply()}
                        disabled={submitApp.isPending || fitStatus?.needsReassessment}
                      >
                        {submitApp.isPending ? '提交中…' : '提交申请'}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-destructive/30">
                    <CardContent className="py-6 text-center">
                      <ProjectFitResultBadge
                        result={report.overallResult}
                        label={report.overallResultLabel}
                        showDescription
                      />
                      <p className="mt-4 text-sm text-muted-foreground">
                        暂不推荐加入此项目，请调整行程或选择其他项目。
                      </p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to="/dashboard/trusted-projects">浏览其他项目</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
