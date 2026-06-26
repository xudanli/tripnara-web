import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { participantPortalHrefFromLink } from '@/features/participant-portal';
import { pollProjectFitParticipantPortal } from '@/features/participant-portal/lib/project-fit-portal-poll';
import { ProjectFitReportPanel } from '../components/ProjectFitReportPanel';
import {
  useClarifyProjectFitApplication,
  useConfirmProjectFitApplication,
  useFitAssessmentReport,
  useMarkDepositPaid,
  useProjectFitApplication,
  useSubmitProjectFitAppeal,
} from '@/hooks/useProjectFit';
import {
  canConfirmApplication,
  commitmentStatusLabel,
  confirmSuccessMessage,
  formatDepositAmount,
  projectFitApplicationStatusLabel,
} from '@/lib/project-fit-display';
import { useTrustedProject } from '@/hooks/useTrustedProjects';

export default function ProjectFitApplicationPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: application, isLoading } = useProjectFitApplication(applicationId);
  const { data: project } = useTrustedProject(application?.listingId);
  const { data: report, isLoading: reportLoading } = useFitAssessmentReport(
    application?.fitAssessmentId,
    'applicant'
  );

  const confirm = useConfirmProjectFitApplication(applicationId ?? '');
  const depositPaid = useMarkDepositPaid(applicationId ?? '');
  const clarify = useClarifyProjectFitApplication(applicationId ?? '');
  const appeal = useSubmitProjectFitAppeal();
  const [appealReason, setAppealReason] = useState('');
  const [clarifyMessage, setClarifyMessage] = useState('');

  const handleConfirm = async () => {
    if (!canConfirmApplication(application?.commitmentStatus)) {
      toast.error('商业项目需先完成定金确认后再加入');
      return;
    }
    try {
      const result = await confirm.mutateAsync();
      toast.success(confirmSuccessMessage(result.status));
      const portal = await pollProjectFitParticipantPortal(
        applicationId!,
        queryClient,
        result,
      );
      if (portal?.portalPath) {
        navigate(participantPortalHrefFromLink(portal));
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '确认失败';
      toast.error(msg);
    }
  };

  const handleDepositPaid = async () => {
    try {
      await depositPaid.mutateAsync();
      toast.success('定金已确认，可进行双向确认');
    } catch {
      toast.error('定金确认失败');
    }
  };

  const handleClarify = async () => {
    if (clarifyMessage.trim().length < 5) {
      toast.error('补充说明至少 5 字');
      return;
    }
    try {
      await clarify.mutateAsync({ message: clarifyMessage.trim() });
      toast.success('已回复，等待领队审核');
      setClarifyMessage('');
    } catch {
      toast.error('发送失败');
    }
  };

  const handleAppeal = async () => {
    if (!applicationId || appealReason.trim().length < 10) {
      toast.error('申诉理由至少 10 字');
      return;
    }
    try {
      await appeal.mutateAsync({
        targetType: 'APPLICATION',
        targetId: applicationId,
        reason: appealReason.trim(),
      });
      toast.success('申诉已提交');
      setAppealReason('');
    } catch {
      toast.error('申诉提交失败');
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={`/dashboard/trusted-projects/${application?.listingId ?? ''}`}
          title="申请详情"
          subtitle={project?.title}
          maxWidth="full"
        />
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        {isLoading && (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        )}

        {application && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  申请状态
                  <Badge>{projectFitApplicationStatusLabel(application.status)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {application.message && <p>说明：{application.message}</p>}
                {application.leaderNotes && <p>领队备注：{application.leaderNotes}</p>}
                {application.status === 'APPROVED' && (
                  <>
                    {application.commitmentStatus === 'DEPOSIT_REQUIRED' && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3 space-y-2">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                          商业项目定金（占位）
                        </p>
                        <p className="text-xs text-muted-foreground">
                          待付定金 {formatDepositAmount(application.depositAmountCents)} ·{' '}
                          {commitmentStatusLabel(application.commitmentStatus)}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDepositPaid()}
                          disabled={depositPaid.isPending}
                        >
                          {depositPaid.isPending ? '提交中…' : '确认已付定金'}
                        </Button>
                      </div>
                    )}
                    {canConfirmApplication(application.commitmentStatus) && (
                      <Button onClick={() => void handleConfirm()} disabled={confirm.isPending}>
                        {confirm.isPending ? '确认中…' : '双向确认 · 确认加入'}
                      </Button>
                    )}
                  </>
                )}
                {(application.status === 'JOINED' || application.status === 'USER_CONFIRMED') && (
                  <div className="space-y-2">
                    <p className="text-foreground">
                      {application.status === 'JOINED'
                        ? '你已入队，可在成员门户继续填写偏好与参与协同。'
                        : '你已确认加入意向。'}
                    </p>
                    {application.participantPortal?.portalPath ? (
                      <Button asChild size="sm">
                        <Link to={participantPortalHrefFromLink(application.participantPortal)}>
                          进入成员门户
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                )}
                {application.status === 'REJECTED' && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/dashboard/trusted-projects/${application.listingId}/fit`}>
                      重新评估适合度
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {application.status === 'NEEDS_CLARIFICATION' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">补充沟通</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={clarifyMessage}
                    onChange={(e) => setClarifyMessage(e.target.value)}
                    placeholder="回复领队的问题或补充说明"
                    rows={3}
                  />
                  <Button onClick={() => void handleClarify()} disabled={clarify.isPending}>
                    {clarify.isPending ? '发送中…' : '发送回复'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {reportLoading && <LogoLoading size={28} />}
            {report && <ProjectFitReportPanel report={report} role="applicant" />}

            {(application.status === 'REJECTED' || application.status === 'APPROVAL_REVOKED') && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">申诉</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    若申诉成立，申请将自动重开为 UNDER_REVIEW，评估可能需重做。
                  </p>
                  <Textarea
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    placeholder="说明申诉理由（至少 10 字）"
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    onClick={() => void handleAppeal()}
                    disabled={appeal.isPending}
                  >
                    提交申诉
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
