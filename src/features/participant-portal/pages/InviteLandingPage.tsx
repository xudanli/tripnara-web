import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptParticipantInvite } from '@/hooks/useParticipantPortal';
import { resolveParticipantPortalErrorGuide } from '../lib/participant-portal-errors';
import type { AcceptParticipantInviteResponse } from '@/types/participant-portal';
import { CompletionProgressCard } from '../components/CompletionProgressCard';
import { ParticipantHelpFooter } from '../components/ParticipantHelpFooter';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import {
  estimatedMinutes,
  participationSteps,
} from '../lib/participant-consent';
import {
  buildAcceptInviteBody,
  ParticipantLoginHint,
} from '../lib/participant-auth';
import { portalPathForPhase, mapParticipantStatusToPhase, participantInvitePath } from '../shell/participant-phase';

export default function InviteLandingPage() {
  const { token = '' } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invite, refetchInvite } = useParticipantProject();
  const acceptInvite = useAcceptParticipantInvite(token);
  const [mismatch, setMismatch] = useState<AcceptParticipantInviteResponse | null>(null);
  const [skipOpen, setSkipOpen] = useState(false);

  if (!invite) return null;

  const steps = participationSteps(invite);
  const returnPath = `${participantInvitePath(token)}${location.search}`;

  const navigateAfterAccept = (status: AcceptParticipantInviteResponse['status']) => {
    const phase = mapParticipantStatusToPhase(status);
    navigate(portalPathForPhase(token, phase));
  };

  const handleAccept = async (confirmMismatch = false) => {
    try {
      const res = await acceptInvite.mutateAsync(
        buildAcceptInviteBody(user, { confirmMismatch }),
      );
      if (res.needsConfirmation) {
        setMismatch(res);
        return;
      }
      await refetchInvite();
      navigateAfterAccept(res.status);
    } catch (e) {
      const guide = resolveParticipantPortalErrorGuide(e);
      toast.error(guide.description);
    }
  };

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />
      <CompletionProgressCard phase="joining" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">参与说明</CardTitle>
          </div>
          <CardDescription>
            预计 {estimatedMinutes(invite)} 分钟完成关键输入。部分步骤由 TripNARA 团队人工协助完成。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>

          {invite.project.summary ? (
            <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
              {invite.project.summary}
            </p>
          ) : null}

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">隐私摘要</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>公开偏好：团队/顾问按项目权限可见</li>
              <li>私密约束：顾问仅见脱敏结论，不见原文</li>
            </ul>
          </div>

          <Button
            className="w-full"
            disabled={acceptInvite.isPending}
            onClick={() => void handleAccept(false)}
          >
            {acceptInvite.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            接受邀请并继续
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={acceptInvite.isPending}
            onClick={() => setSkipOpen(true)}
          >
            暂不加入
          </Button>
        </CardContent>
      </Card>

      <ParticipantHelpFooter />
      <ParticipantLoginHint returnPath={returnPath} />

      <AlertDialog open={skipOpen} onOpenChange={setSkipOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>暂不加入？</AlertDialogTitle>
            <AlertDialogDescription>
              您可以稍后再通过同一邀请链接返回。若确定不再参与，请在后续同意环节选择拒绝。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续查看</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
            >
              离开
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(mismatch)} onOpenChange={(open) => !open && setMismatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>请确认身份</AlertDialogTitle>
            <AlertDialogDescription>
              {mismatch?.message ??
                '当前登录账号或联系方式与邀请目标不一致，继续将把此邀请绑定到当前账号。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleAccept(true)}>确认继续</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
