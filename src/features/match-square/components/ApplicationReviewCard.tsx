import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Puzzle,
  Star,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RecruitmentApplicationCard } from '@/types/match-square';
import { CompatibilityBadge } from './CompatibilityBadge';
import { CredentialsHeadlineStrip } from './CredentialsHeadlineStrip';
import { CaptainTrustProfileSheet } from './CaptainTrustProfileSheet';
import { useUserVerifiedCredentials } from '../hooks/useUserVerifiedCredentials';
import { DecisionEngineBriefPanel, showDecisionEngineHint } from './DecisionEngineBriefPanel';
import { pickRicherApplicantCredentials, resolveApplicantRealName, sanitizeMemberApplicantCredentials } from '../lib/resolve-applicant-credentials';
import { isPuzzleDeficitPersonaLabel } from '../lib/compact-puzzle-slot-label';
import { enrichVerifiedCredentialsDossier } from '../lib/verified-credentials';
import { plazaBanner, plazaCard, plazaReview } from '../lib/plaza-visual';

interface ApplicationReviewCardProps {
  application: RecruitmentApplicationCard;
  onApprove: () => void;
  onReject: () => void;
  onAskMore?: () => void;
  isReviewing?: boolean;
}

export function ApplicationReviewCard({
  application,
  onApprove,
  onReject,
  onAskMore,
  isReviewing,
}: ApplicationReviewCardProps) {
  const [trustOpen, setTrustOpen] = useState(false);
  const embedded = application.applicantVerifiedCredentials;
  const { data: fetchedCredentials, isLoading: credentialsLoading } = useUserVerifiedCredentials(
    application.applicantUserId,
    {
      postId: application.postId,
      cardTitle: application.applicantCardTitle,
      mbtiType: application.applicantMbtiType,
      initialData: embedded,
    }
  );
  const credentialsRaw = pickRicherApplicantCredentials(embedded, fetchedCredentials ?? null);
  const applicantRealName = resolveApplicantRealName(application, credentialsRaw);
  const credentials = credentialsRaw
    ? sanitizeMemberApplicantCredentials(credentialsRaw, applicantRealName)
    : null;

  return (
    <>
      <div className={plazaReview.card}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-medium text-foreground">申请人 · {applicantRealName}</span>
          <span className="hidden text-muted-foreground sm:inline" aria-hidden>
            |
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Puzzle className="h-3.5 w-3.5" aria-hidden />
            匹配度
            <CompatibilityBadge percent={application.compatibilityPercent} className="px-2 py-0.5" />
          </span>
          {application.applicantReputationStars != null && (
            <>
              <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
                <Star className="h-3.5 w-3.5 text-foreground/70" aria-hidden />
                历史星级 {application.applicantReputationStars.toFixed(1)}
              </span>
            </>
          )}
        </div>

        {!isPuzzleDeficitPersonaLabel(application.applicantCardTitle) && (
        <div className={cn('mt-2', plazaCard.personaRow)}>
          <span className={cn(plazaCard.personaTitle, 'inline-flex items-center gap-1 text-sm')}>
            <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {application.applicantCardTitle}
          </span>
          {application.applicantInteractionModeLabel &&
            application.applicantInteractionModeLabel !== application.applicantCardTitle && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground')}>
                  <UsersRound className="h-3.5 w-3.5" aria-hidden />
                  {application.applicantInteractionModeLabel}
                </span>
              </>
            )}
        </div>
        )}

        {application.targetSlotLabel && (
          <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)]/60 px-2 py-1 text-xs text-[var(--gate-suggest-foreground)]">
            <Puzzle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            补位意向 · {application.targetSlotLabel}
          </p>
        )}

        {credentialsLoading && !credentials?.headline?.identityHeadline && (
          <p className="mt-3 text-xs text-muted-foreground">加载身份背书…</p>
        )}

        {credentials?.headline?.identityHeadline && (
          <CredentialsHeadlineStrip
            credentials={credentials}
            variant="detail"
            subjectRole="member"
            onOpenTrustProfile={() => setTrustOpen(true)}
            className="mt-3"
          />
        )}

        {application.safetyWarning && (
          <div className={cn(plazaBanner.base, plazaBanner.reject, 'mt-3')} role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <p>{application.safetyWarning}</p>
          </div>
        )}

        {application.physicalFitnessReport?.evidenceLabel && (
          <div className={cn(plazaBanner.base, 'mt-3 border-[var(--gate-allow-border)] bg-[var(--gate-allow)]/30 text-[var(--gate-allow-foreground)]')} role="note">
            <p className="text-xs font-medium">体能拟合</p>
            <p className="mt-0.5 text-sm">
              {application.physicalFitnessReport.evidenceLabel}
              {application.physicalFitnessReport.fitPercent != null && (
                <span className="ml-1 tabular-nums">
                  · {application.physicalFitnessReport.fitPercent}%
                </span>
              )}
            </p>
            {application.physicalFitnessReport.lines?.map((line) => (
              <p key={line} className="mt-1 text-xs opacity-90">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className={plazaCard.divider} />

        <div className="space-y-4 text-sm">
          <div>
            <p className={plazaReview.sectionLabel}>匹配亮点</p>
            <ul className="space-y-1.5">
              {(application.highlights ?? []).map((h, i) => (
                <li key={i} className={plazaReview.listItem}>
                  <CheckCircle2 className={plazaReview.highlightIcon} aria-hidden />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {(application.warnings ?? []).length > 0 && (
            <div>
              <p className={plazaReview.sectionLabel}>需留意</p>
              <ul className="space-y-1.5">
                {(application.warnings ?? []).map((w, i) => (
                  <li key={i} className={plazaReview.listItem}>
                    <AlertTriangle className={plazaReview.warningIcon} aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showDecisionEngineHint(application.decisionBrief) && application.decisionBrief && (
            <DecisionEngineBriefPanel brief={application.decisionBrief} />
          )}

          <div>
            <p className={plazaReview.sectionLabel}>队员留言</p>
            <p className={plazaCard.quote}>{application.message}</p>
          </div>
        </div>

        {application.status !== 'pending' ? (
          <Badge
            className="mt-4"
            variant={application.status === 'approved' ? 'default' : 'secondary'}
          >
            {application.status === 'approved' ? '已通过' : '已拒绝'}
          </Badge>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-[var(--gate-reject-border)] text-[var(--gate-reject-foreground)] hover:bg-[var(--gate-reject)]"
              disabled={isReviewing}
              onClick={onReject}
            >
              <XCircle className="mr-1.5 h-4 w-4" aria-hidden />
              拒绝申请
            </Button>
            {onAskMore && (
              <Button variant="outline" disabled={isReviewing} onClick={onAskMore}>
                <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden />
                询问更多
              </Button>
            )}
            <Button
              className="bg-[var(--gate-allow-foreground)] text-[var(--gate-allow)] hover:opacity-90"
              disabled={isReviewing}
              onClick={onApprove}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
              通过申请
            </Button>
          </div>
        )}
      </div>

      {credentials && (
        <CaptainTrustProfileSheet
          credentials={enrichVerifiedCredentialsDossier(credentials, {
            reputationStars: application.applicantReputationStars,
          })}
          subtitle={`${application.applicantCardTitle} · ${application.applicantInteractionModeLabel}`}
          reputationStars={application.applicantReputationStars}
          open={trustOpen}
          onOpenChange={setTrustOpen}
        />
      )}
    </>
  );
}
