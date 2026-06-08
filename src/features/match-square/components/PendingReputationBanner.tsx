import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CompanionToRate, PendingSurveyCampaign } from '@/types/reputation';
import {
  pickActiveCampaign,
  unratedCompanions,
  usePendingReputationSurveys,
} from '../hooks/useReputation';
import { ReputationSurveyDialog } from './ReputationSurveyDialog';
import { plazaBanner } from '../lib/plaza-visual';

/** 广场内嵌 Banner（与全局弹窗共用 campaign 数据） */
export function PendingReputationBanner() {
  const { data } = usePendingReputationSurveys();
  const [open, setOpen] = useState(false);
  const [campaign, setCampaign] = useState<PendingSurveyCampaign | null>(null);
  const [reviewee, setReviewee] = useState<CompanionToRate | null>(null);
  const [queue, setQueue] = useState<CompanionToRate[]>([]);

  const active = pickActiveCampaign(data?.campaigns);
  if (!active) return null;

  const pendingCount = unratedCompanions(active).length;
  if (pendingCount === 0) return null;

  const startSurvey = () => {
    const companions = unratedCompanions(active);
    setCampaign(active);
    setQueue(companions);
    setReviewee(companions[0]);
    setOpen(true);
  };

  const handleComplete = () => {
    const rest = queue.slice(1);
    if (rest.length > 0) {
      setQueue(rest);
      setReviewee(rest[0]);
      setOpen(true);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <div
        className={cn(plazaBanner.base, plazaBanner.suggest, 'items-center justify-between')}
        role="status"
      >
        <div className="flex items-start gap-2 text-sm">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <p className="leading-relaxed">
            {active.pushCopy.title} — {active.destinationLabel ?? '本次行程'}（待评 {pendingCount}{' '}
            人）
          </p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 border-current/20" onClick={startSurvey}>
          去互评
        </Button>
      </div>

      <ReputationSurveyDialog
        campaign={campaign}
        reviewee={reviewee}
        open={open}
        onOpenChange={setOpen}
        onRevieweeComplete={handleComplete}
      />
    </>
  );
}
