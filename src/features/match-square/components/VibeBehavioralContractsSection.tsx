import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecruitmentPostCard } from '@/types/match-square';
import { resolveBehavioralContracts } from '../lib/vibe-llm/to-card-view';
import { plazaDetail } from '../lib/plaza-visual';
import { VibeBehavioralContractsList } from './VibeBehavioralContractsList';

interface VibeBehavioralContractsSectionProps {
  post: RecruitmentPostCard;
  className?: string;
}

/** 详情页 · Vibe 行为契约（与组队风格承诺 teamworkCommitmentPrompt 独立） */
export function VibeBehavioralContractsSection({
  post,
  className,
}: VibeBehavioralContractsSectionProps) {
  const contracts = resolveBehavioralContracts(post);
  if (!contracts.length) return null;

  return (
    <section className={cn(className)} aria-label="Vibe 行为契约">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden />
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Vibe 行为契约
        </h2>
      </div>
      <div className={cn('mt-2', plazaDetail.sectionBody)}>
        <VibeBehavioralContractsList contracts={contracts} />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground/80">
        申请加入时需勾选同意；与上方「组队风格承诺」为两套独立契约。
      </p>
    </section>
  );
}
