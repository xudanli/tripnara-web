import { cn } from '@/lib/utils';
import type { RecruitmentPostStatus } from '@/types/match-square';
import { RECRUITMENT_STATUS_LABELS } from '../lib/constants';
import { plazaPostStatus } from '../lib/plaza-visual';

interface RecruitmentStatusBadgeProps {
  status: RecruitmentPostStatus;
  className?: string;
}

/** 招募帖状态 — Gate 四态语义：招募中 ALLOW / 已下架 muted / 已结束 confirm */
export function RecruitmentStatusBadge({ status, className }: RecruitmentStatusBadgeProps) {
  const label = RECRUITMENT_STATUS_LABELS[status as keyof typeof RECRUITMENT_STATUS_LABELS] ?? status;
  const style = plazaPostStatus[status as keyof typeof plazaPostStatus] ?? plazaPostStatus.hidden;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium leading-none',
        style.badge,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} aria-hidden />
      {label}
    </span>
  );
}
