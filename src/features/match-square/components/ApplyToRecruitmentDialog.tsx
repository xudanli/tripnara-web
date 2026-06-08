import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { VibeBehavioralContractsApplyPanel } from './VibeBehavioralContractsApplyPanel';
import { ApplySlotIntentPanel } from './ApplySlotIntentPanel';
import { toast } from 'sonner';
import { APPLICATION_MESSAGE_MAX } from '../lib/constants';
import {
  pickDefaultApplySlotId,
  resolveApplySlotIntents,
  resolveApplySlotPayload,
} from '../lib/apply-slot-intent';
import { useApplyPreview, usePostDetail, useSubmitApplication } from '../hooks/useMatchSquare';
import { usePlazaMatchContext } from '../hooks/usePlazaMatchContext';
import { MatchSquareApiError } from '@/api/match-square';
import { buildRouteContractLockPlan } from '../lib/route-contract-vault';
import { RouteContractVaultPanel } from './RouteContractVaultPanel';
import { PhysicalSurvivalQuizPanel } from './PhysicalSurvivalQuizPanel';
import {
  isPhysicalSurvivalQuizComplete,
} from '../lib/physical-survival-quiz';

interface ApplyToRecruitmentDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function ApplyPledgeBlock({
  id,
  tone,
  message,
  checked,
  onCheckedChange,
  label,
}: {
  id: string;
  tone: 'amber' | 'sky';
  message: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-500/25 bg-amber-500/8 text-amber-950 dark:text-amber-100'
      : 'border-sky-500/25 bg-sky-500/8 text-sky-950 dark:text-sky-100';

  return (
    <div className={cn('space-y-1.5 rounded-md border p-2', toneClass)}>
      <p className="text-xs leading-snug">{message}</p>
      <div className="flex items-start gap-2">
        <Checkbox id={id} className="mt-0.5" checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
        <Label htmlFor={id} className="text-xs leading-snug">
          {label}
        </Label>
      </div>
    </div>
  );
}

export function ApplyToRecruitmentDialog({
  postId,
  open,
  onOpenChange,
  onSuccess,
}: ApplyToRecruitmentDialogProps) {
  const [message, setMessage] = useState('');
  const [planningCommitmentAccepted, setPlanningCommitmentAccepted] = useState(false);
  const [teamworkCommitmentAccepted, setTeamworkCommitmentAccepted] = useState(false);
  const [vibeContractsAccepted, setVibeContractsAccepted] = useState(false);
  const [routeContractAccepted, setRouteContractAccepted] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [survivalQuizAnswers, setSurvivalQuizAnswers] = useState<Record<string, string>>({});
  const { data: preview } = useApplyPreview(open ? postId : undefined, open);
  const { data: post } = usePostDetail(open ? postId : undefined);
  const { viewerProfile } = usePlazaMatchContext();
  const submit = useSubmitApplication();

  const slotIntents = useMemo(
    () => (post ? resolveApplySlotIntents(post, viewerProfile) : []),
    [post, viewerProfile]
  );

  useEffect(() => {
    if (!open) {
      setSelectedSlotId(null);
      setSurvivalQuizAnswers({});
      return;
    }
    if (slotIntents.length > 0) {
      setSelectedSlotId(pickDefaultApplySlotId(slotIntents));
    }
  }, [open, slotIntents]);

  const routeContractPlan =
    post?.routeTemplateCatalogId && post.planningStyle
      ? buildRouteContractLockPlan(post.routeTemplateCatalogId, post.planningStyle)
      : post?.routeTemplateCatalogId
        ? buildRouteContractLockPlan(post.routeTemplateCatalogId)
        : null;
  const needsRouteContract = Boolean(routeContractPlan);

  const needsPlanningPledge = Boolean(preview?.conflictPrompt);
  const needsTeamworkPledge = Boolean(preview?.teamworkCommitmentPrompt);
  const vibeContracts =
    preview?.vibeBehavioralContracts ??
    preview?.vibeBehaviorContracts?.map((c) => ({
      title: c.tag,
      clauses: [c.clause],
    })) ??
    [];
  const needsVibeContracts = vibeContracts.length > 0;
  const survivalQuestions = preview?.physicalSurvivalQuiz ?? [];
  const needsSurvivalQuiz = survivalQuestions.length > 0;
  const survivalQuizComplete = isPhysicalSurvivalQuizComplete(survivalQuestions, survivalQuizAnswers);
  const physicalBlocked = preview?.physicalFitnessGate?.blocked === true;
  const formHidden = preview?.canApply === false || physicalBlocked;
  const canSubmit =
    preview?.canApply !== false &&
    !physicalBlocked &&
    message.trim().length > 0 &&
    message.length <= APPLICATION_MESSAGE_MAX &&
    (!needsPlanningPledge || planningCommitmentAccepted) &&
    (!needsTeamworkPledge || teamworkCommitmentAccepted) &&
    (!needsVibeContracts || vibeContractsAccepted) &&
    (!needsRouteContract || routeContractAccepted) &&
    (!needsSurvivalQuiz || survivalQuizComplete);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await submit.mutateAsync({
        postId,
        payload: {
          message: message.trim(),
          planningCommitmentAccepted: needsPlanningPledge ? true : undefined,
          teamworkCommitmentAccepted: needsTeamworkPledge ? true : undefined,
          vibeContractsAccepted: needsVibeContracts ? true : undefined,
          routeContractAccepted: needsRouteContract ? true : undefined,
          physicalSurvivalQuizAnswers: needsSurvivalQuiz ? survivalQuizAnswers : undefined,
          ...resolveApplySlotPayload(slotIntents, selectedSlotId),
        },
      });
      toast.success('申请已提交，等待队长审批');
      setMessage('');
      setPlanningCommitmentAccepted(false);
      setTeamworkCommitmentAccepted(false);
      setVibeContractsAccepted(false);
      setRouteContractAccepted(false);
      setSurvivalQuizAnswers({});
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof MatchSquareApiError ? error.message : '提交失败，请重试';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,780px)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-0 px-4 pb-1 pt-4 pr-10">
          <DialogTitle className="text-base leading-snug">申请加入队伍</DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            向队长说明加入原因（{APPLICATION_MESSAGE_MAX} 字以内，必填）
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2">
          {formHidden && preview?.blockReason && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2">
              <p className="text-xs font-medium text-destructive">暂无法申请</p>
              <p className="mt-0.5 text-xs text-destructive/90">{preview.blockReason}</p>
            </div>
          )}

          {!formHidden && preview?.blockReason && (
            <p className="text-xs text-muted-foreground">{preview.blockReason}</p>
          )}

          {!formHidden && preview?.physicalFitnessGate?.report?.evidenceLabel && (
            <p className="rounded-md border border-[var(--gate-allow-border)] bg-[var(--gate-allow)]/40 px-2 py-1.5 text-xs text-[var(--gate-allow-foreground)]">
              体能拟合：{preview.physicalFitnessGate.report.evidenceLabel}
              {preview.physicalFitnessGate.report.fitPercent != null && (
                <span className="ml-1 tabular-nums">
                  · {preview.physicalFitnessGate.report.fitPercent}%
                </span>
              )}
            </p>
          )}

          {!formHidden && (
          <>
          <div className="space-y-0.5">
            <Textarea
              placeholder="旅行经验、能贡献什么、为什么契合…"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, APPLICATION_MESSAGE_MAX))}
              rows={2}
              className="min-h-[3.25rem] resize-none text-sm leading-snug"
              disabled={formHidden}
            />
            <p className="text-right text-[10px] tabular-nums text-muted-foreground">
              {message.length}/{APPLICATION_MESSAGE_MAX}
            </p>
          </div>

          {needsSurvivalQuiz && (
            <PhysicalSurvivalQuizPanel
              questions={survivalQuestions}
              answers={survivalQuizAnswers}
              onChange={setSurvivalQuizAnswers}
            />
          )}

          {needsPlanningPledge && preview?.conflictPrompt && (
            <ApplyPledgeBlock
              id="pledge-planning"
              tone="amber"
              message={preview.conflictPrompt.message}
              checked={planningCommitmentAccepted}
              onCheckedChange={setPlanningCommitmentAccepted}
              label="我愿意配合核心行程，不因个人节奏影响全队"
            />
          )}

          {needsTeamworkPledge && preview?.teamworkCommitmentPrompt && (
            <ApplyPledgeBlock
              id="pledge-teamwork"
              tone="sky"
              message={preview.teamworkCommitmentPrompt.message}
              checked={teamworkCommitmentAccepted}
              onCheckedChange={setTeamworkCommitmentAccepted}
              label="我已阅读并同意上述组队风格承诺"
            />
          )}

          {needsVibeContracts && (
            <VibeBehavioralContractsApplyPanel
              contracts={vibeContracts}
              accepted={vibeContractsAccepted}
              onAcceptedChange={setVibeContractsAccepted}
            />
          )}

          {slotIntents.length > 0 && !formHidden && (
            <ApplySlotIntentPanel
              intents={slotIntents}
              value={selectedSlotId}
              onChange={setSelectedSlotId}
            />
          )}

          {needsRouteContract && routeContractPlan && (
            <div className="space-y-2">
              <RouteContractVaultPanel plan={routeContractPlan} variant="apply" />
              <ApplyPledgeBlock
                id="pledge-route-contract"
                tone="amber"
                message={routeContractPlan.contractSummary}
                checked={routeContractAccepted}
                onCheckedChange={setRouteContractAccepted}
                label="我确认加入 = 签署路线模板里程碑与 MBTI 契约，接受 Trip Vault 托管节奏"
              />
            </div>
          )}
          </>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-2.5 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {!formHidden && (
          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit || submit.isPending}>
            {submit.isPending ? '提交中…' : '提交申请'}
          </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
