import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CompletionProgressCard } from '../components/CompletionProgressCard';
import { ParticipantNotificationsPanel } from '../components/ParticipantNotificationsPanel';
import { ChangeNoticeCard } from '../components/ChangeNoticeCard';
import { ParticipantHelpFooter } from '../components/ParticipantHelpFooter';
import { PrimaryActionCard } from '../components/PrimaryActionCard';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import { participantProjectPath, portalPathForPhase } from '../shell/participant-phase';
import { useParticipantTrustSurface } from '@/hooks/useParticipantPortal';
import { filterParticipantTrustCards } from '@/lib/gate1-trust-display';

export default function ParticipantDashboardPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { invite, dashboard, phase, isDashboardLoading, withdrawMutation } =
    useParticipantProject();
  const { data: trustSurface } = useParticipantTrustSurface(
    phase === 'active' ? token : undefined,
  );

  const trustCardCount =
    dashboard?.trustSurface?.cardCount ??
    filterParticipantTrustCards(trustSurface?.cards ?? []).length ??
    0;

  if (!invite) return null;

  if (phase === 'joining' || phase === 'consenting' || phase === 'profiling') {
    navigate(portalPathForPhase(token, phase), { replace: true });
    return null;
  }

  if (phase === 'withdrawn') {
    navigate(participantProjectPath(token, 'withdrawn'), { replace: true });
    return null;
  }

  if (phase === 'declined') {
    navigate(participantProjectPath(token, 'declined'), { replace: true });
    return null;
  }

  const handleWithdraw = async () => {
    try {
      await withdrawMutation.mutateAsync();
      toast.success('已撤回授权');
      navigate(participantProjectPath(token, 'withdrawn'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '撤回失败');
    }
  };

  const primary = dashboard?.primaryAction;
  const proposal = dashboard?.proposalSummary;

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />
      <CompletionProgressCard
        phase={phase}
        completionRate={dashboard?.progress.completionRate}
      />

      {isDashboardLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <>
          {primary ? (
            <PrimaryActionCard
              priority={primary.priority}
              title={primary.title}
              reason={primary.reason ?? '请完成此项以推进项目'}
              impact={primary.impact}
              dueLabel={primary.dueAt ? `截止：${primary.dueAt}` : undefined}
              actionLabel="去完成"
              onAction={() => {
                if (primary.actionPath) {
                  navigate(primary.actionPath);
                } else {
                  navigate(participantProjectPath(token, 'preferences'));
                }
              }}
            />
          ) : null}

          {dashboard?.todos && dashboard.todos.length > 1 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">待办事项</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.todos.slice(0, 5).map((todo) => (
                  <button
                    key={todo.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() => todo.actionPath && navigate(todo.actionPath)}
                  >
                    <span>{todo.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{todo.priority}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">团队方案</CardTitle>
              <CardDescription>
                {proposal ? `${proposal.label} · v${proposal.version}` : '方案尚未发布'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {proposal?.strategySummary ? <p>{proposal.strategySummary}</p> : null}
              {proposal ? (
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() =>
                    navigate(participantProjectPath(token, `proposals/${proposal.candidateId}`))
                  }
                >
                  查看方案并反馈
                </button>
              ) : (
                <p>顾问发布方案后，您将收到与个人相关的安排与确认请求。</p>
              )}
            </CardContent>
          </Card>

          {trustCardCount > 0 ? (
            <Card className="border-gate-allow-border/60 bg-gate-allow/30 dark:border-gate-allow-border/40 dark:bg-gate-allow/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" />
                  方案说明与依据
                </CardTitle>
                <CardDescription>{trustCardCount} 项脱敏说明</CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => navigate(participantProjectPath(token, 'trust-surface'))}
                >
                  查看方案依据
                </button>
              </CardContent>
            </Card>
          ) : null}

          {dashboard?.recentChanges && dashboard.recentChanges.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">最近变化</CardTitle>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => navigate(participantProjectPath(token, 'changes'))}
                >
                  查看全部
                </button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {dashboard.recentChanges.map((change) => (
                  <ChangeNoticeCard
                    key={change.id}
                    compact
                    notice={{
                      id: change.id,
                      severity: change.severity ?? 'LOW',
                      title: change.title ?? change.whatHappened ?? '行程变化',
                      whatHappened: change.whatHappened ?? change.title ?? '行程变化',
                      impactSummary: change.impactSummary,
                      actionRequired: change.actionRequired,
                      deadline: change.deadline,
                      publishedAt: change.deadline ?? new Date().toISOString(),
                      requiresAck: !change.acknowledged,
                      acknowledged: change.acknowledged ?? false,
                    }}
                    detailHref={participantProjectPath(token, `changes/${change.id}`)}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}

          {(dashboard?.progress.openReadinessTasks ?? 0) > 0 ? (
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">准备事项</p>
                  <p className="text-xs text-muted-foreground">
                    还有 {dashboard?.progress.openReadinessTasks} 项待完成
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => navigate(participantProjectPath(token, 'readiness'))}
                >
                  去准备
                </button>
              </CardContent>
            </Card>
          ) : null}

          <ParticipantNotificationsPanel token={token} />
        </>
      )}

      <ParticipantHelpFooter
        onWithdraw={() => void handleWithdraw()}
        withdrawPending={withdrawMutation.isPending}
      />
    </div>
  );
}
