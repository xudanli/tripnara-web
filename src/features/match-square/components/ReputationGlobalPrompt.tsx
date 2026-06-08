import { useCallback, useEffect, useState } from 'react';
import type { CompanionToRate, PendingSurveyCampaign } from '@/types/reputation';
import {
  pickActiveCampaign,
  unratedCompanions,
  usePendingReputationSurveys,
} from '../hooks/useReputation';
import { ReputationSurveyDialog } from './ReputationSurveyDialog';

const DISMISSED_KEY = 'reputation-os-global-prompt-dismissed';

interface ReputationGlobalPromptProps {
  /** 登录后才拉取 */
  enabled?: boolean;
}

/**
 * PRD 5.1 — App 启动时全局顶层互评弹窗（modalPriority: global_top）
 */
export function ReputationGlobalPrompt({ enabled = true }: ReputationGlobalPromptProps) {
  const { data } = usePendingReputationSurveys(enabled);
  const [open, setOpen] = useState(false);
  const [campaign, setCampaign] = useState<PendingSurveyCampaign | null>(null);
  const [reviewee, setReviewee] = useState<CompanionToRate | null>(null);
  const [companionQueue, setCompanionQueue] = useState<CompanionToRate[]>([]);

  const activateCampaign = useCallback((c: PendingSurveyCampaign) => {
    const queue = unratedCompanions(c);
    if (queue.length === 0) return;
    setCampaign(c);
    setCompanionQueue(queue);
    setReviewee(queue[0]);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!enabled || !data?.campaigns?.length) return;
    const active = pickActiveCampaign(data.campaigns);
    if (!active) return;
    if (active.pushCopy.modalPriority !== 'global_top') return;

    const dismissed = sessionStorage.getItem(`${DISMISSED_KEY}:${active.id}`);
    if (dismissed) return;

    activateCampaign(active);
  }, [enabled, data, activateCampaign]);

  const handleRevieweeComplete = () => {
    const rest = companionQueue.slice(1);
    if (rest.length > 0) {
      setCompanionQueue(rest);
      setReviewee(rest[0]);
      setOpen(true);
      return;
    }
    if (campaign) {
      sessionStorage.setItem(`${DISMISSED_KEY}:${campaign.id}`, '1');
    }
    setCampaign(null);
    setReviewee(null);
    setCompanionQueue([]);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && campaign) {
      sessionStorage.setItem(`${DISMISSED_KEY}:${campaign.id}`, '1');
    }
  };

  return (
    <ReputationSurveyDialog
      campaign={campaign}
      reviewee={reviewee}
      open={open}
      onOpenChange={handleOpenChange}
      onRevieweeComplete={handleRevieweeComplete}
    />
  );
}
