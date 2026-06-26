import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { ProjectFitReportPanel } from '../components/ProjectFitReportPanel';
import { SystemRecommendationBadge } from '../components/SystemRecommendationBadge';
import {
  useApplicationReviewQueue,
  useFitAssessmentReport,
  useLeaderApplicationDecision,
  useProjectFitApplication,
} from '@/hooks/useProjectFit';
import { leaderDecisionLabel, projectFitApplicationStatusLabel } from '@/lib/project-fit-display';
import type { LeaderDecision } from '@/types/project-fit';
import { useTrustedProject } from '@/hooks/useTrustedProjects';

const DECISIONS: LeaderDecision[] = [
  'APPROVE',
  'APPROVE_AFTER_CLARIFICATION',
  'WAITLIST',
  'REJECT',
  'REVOKE_APPROVAL',
];

export default function ProjectFitLeaderReviewPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { data: application, isLoading } = useProjectFitApplication(applicationId);
  const { data: project } = useTrustedProject(application?.listingId);
  const { data: queue } = useApplicationReviewQueue(application?.listingId);
  const { data: report, isLoading: reportLoading } = useFitAssessmentReport(
    application?.fitAssessmentId,
    'leader'
  );

  const queueItem = useMemo(
    () => queue?.items.find((i) => i.applicationId === applicationId),
    [queue, applicationId]
  );

  const [decision, setDecision] = useState<LeaderDecision>('APPROVE');
  const [notes, setNotes] = useState('');

  const submitDecision = useLeaderApplicationDecision(
    applicationId ?? '',
    application?.listingId
  );

  const handleSubmit = async () => {
    try {
      await submitDecision.mutateAsync({
        decision,
        notes: notes.trim() || undefined,
        structuredRejectReason:
          decision === 'REJECT' ? 'TEAM_IMPACT_BLOCKING' : undefined,
      });
      toast.success(`已${leaderDecisionLabel(decision)}`);
    } catch {
      toast.error('审核失败');
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={`/dashboard/trusted-projects/${application?.listingId}/manage`}
          title="领队审核"
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
                  {application.applicantDisplayName ?? application.applicantUserId}
                  <Badge variant="outline">
                    {projectFitApplicationStatusLabel(application.status)}
                  </Badge>
                  {queueItem && (
                    <SystemRecommendationBadge recommendation={queueItem.systemRecommendation} />
                  )}
                </CardTitle>
              </CardHeader>
              {application.message && (
                <CardContent className="text-sm text-muted-foreground">
                  申请说明：{application.message}
                </CardContent>
              )}
            </Card>

            {reportLoading && <LogoLoading size={28} />}
            {report && <ProjectFitReportPanel report={report} role="leader" />}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">审核决定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={decision}
                  onValueChange={(v) => setDecision(v as LeaderDecision)}
                >
                  {DECISIONS.map((d) => (
                    <div key={d} className="flex items-center gap-2">
                      <RadioGroupItem value={d} id={d} />
                      <Label htmlFor={d} className="font-normal">
                        {leaderDecisionLabel(d)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="可选说明（申请人可见）"
                  rows={3}
                />
                <Button onClick={() => void handleSubmit()} disabled={submitDecision.isPending}>
                  {submitDecision.isPending ? '提交中…' : '提交审核'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
