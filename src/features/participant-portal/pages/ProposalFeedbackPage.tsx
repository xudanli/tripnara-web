import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Gate1HumanAssistedBadge } from '@/features/gate1/components/Gate1HumanAssistedBadge';
import {
  useParticipantProposal,
  useParticipantTrustSurface,
  useSubmitProposalFeedback,
} from '@/hooks/useParticipantPortal';
import { TrustCard } from '@/components/decision-os';
import { findCandidateTrustCard, filterParticipantTrustCards } from '@/lib/gate1-trust-display';
import type { ProposalFeedbackResponse } from '@/types/participant-portal';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { resolveParticipantPortalErrorGuide } from '../lib/participant-portal-errors';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import { participantProjectPath } from '../shell/participant-phase';

const RESPONSE_OPTIONS: { value: ProposalFeedbackResponse; label: string; needsNote: boolean }[] =
  [
    { value: 'ACCEPT', label: '可以接受', needsNote: false },
    { value: 'CONCERN', label: '有顾虑', needsNote: true },
    { value: 'REJECT', label: '无法接受', needsNote: true },
    { value: 'NEED_INFO', label: '需要更多信息', needsNote: true },
    { value: 'PRIVATE_CONTACT', label: '希望私下沟通', needsNote: false },
  ];

export default function ProposalFeedbackPage() {
  const { token = '', candidateId = '' } = useParams<{ token: string; candidateId: string }>();
  const navigate = useNavigate();
  const { invite } = useParticipantProject();
  const { data, isLoading } = useParticipantProposal(token, candidateId);
  const { data: trustSurface } = useParticipantTrustSurface(token);
  const submitFeedback = useSubmitProposalFeedback(token, candidateId);

  const [response, setResponse] = useState<ProposalFeedbackResponse>('ACCEPT');
  const [note, setNote] = useState('');
  const [privateNote, setPrivateNote] = useState('');

  if (!invite) return null;

  const selected = RESPONSE_OPTIONS.find((o) => o.value === response);
  const needsReconfirm = data?.feedback?.needsReconfirm ?? data?.feedback?.status === 'INVALIDATED';

  const handleSubmit = async () => {
    if (selected?.needsNote && !note.trim()) {
      toast.error('请填写说明');
      return;
    }
    try {
      await submitFeedback.mutateAsync({
        response,
        note: note.trim() || undefined,
        privateNote: privateNote.trim() || undefined,
      });
      toast.success('反馈已提交');
      navigate(participantProjectPath(token, 'dashboard'));
    } catch (e) {
      const guide = resolveParticipantPortalErrorGuide(e);
      toast.error(guide.description);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!data?.proposal) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">方案暂不可用</CardContent>
      </Card>
    );
  }

  const { proposal, feedback } = data;
  const proposalTrustCard = findCandidateTrustCard(
    filterParticipantTrustCards(trustSurface?.cards ?? []),
    proposal.id,
  );

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {proposal.label} · v{proposal.version}
          </CardTitle>
          <CardDescription>{proposal.strategySummary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Gate1HumanAssistedBadge sourceType="HUMAN_ASSISTED" />
          {needsReconfirm ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              方案已更新，请重新确认（先前反馈 v{feedback?.candidateVersion ?? '?'} 已失效）
            </p>
          ) : null}
          {proposal.tradeoffs?.length ? (
            <ul className="list-inside list-disc text-muted-foreground">
              {proposal.tradeoffs.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {proposalTrustCard ? (
        <TrustCard card={proposalTrustCard} variant="participant" />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">您的反馈</CardTitle>
          <CardDescription>反馈将绑定方案版本 v{proposal.version}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>反馈类型</Label>
            <Select value={response} onValueChange={(v) => setResponse(v as ProposalFeedbackResponse)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected?.needsNote ? (
            <div className="space-y-2">
              <Label htmlFor="feedback-note">说明 *</Label>
              <Textarea
                id="feedback-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          ) : null}

          {response === 'PRIVATE_CONTACT' ? (
            <div className="space-y-2">
              <Label htmlFor="private-note">私密说明（可选）</Label>
              <Textarea
                id="private-note"
                rows={2}
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
              />
            </div>
          ) : null}

          <Button disabled={submitFeedback.isPending} onClick={() => void handleSubmit()}>
            提交反馈
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
