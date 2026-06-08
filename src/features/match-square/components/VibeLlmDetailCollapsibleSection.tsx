import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { RecruitmentPostCard } from '@/types/match-square';
import { ContractInterpretationSection } from './ContractInterpretationSection';
import { VibeChipStream } from './VibeChipStream';
import { filterExperienceChips } from '../lib/filter-experience-chips';
import { plazaDetail, plazaReview } from '../lib/plaza-visual';

interface VibeLlmDetailCollapsibleSectionProps {
  post: RecruitmentPostCard;
  className?: string;
}

/** §4.1 P1 — 仅 vibeLlm 存在时折叠展示 chips + contractHint */
export function VibeLlmDetailCollapsibleSection({
  post,
  className,
}: VibeLlmDetailCollapsibleSectionProps) {
  if (!post.vibeLlm) return null;

  const chips = filterExperienceChips(post.vibeLlm.chips).map((chip) => chip.label);
  const hasContract = Boolean(post.vibeLlm.contractHint?.trim());
  if (!chips.length && !hasContract) return null;

  return (
    <Collapsible className={className}>
      <section className={cn(plazaReview.card)} aria-label="Vibe 旅行愿景">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
          <div className="flex min-w-0 items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Vibe 旅行愿景</h2>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </CollapsibleTrigger>

        <CollapsibleContent className={cn('mt-3 space-y-3', plazaDetail.sectionBody)}>
          {chips.length > 0 && <VibeChipStream chips={chips} tone="neutral" />}
          {hasContract && <ContractInterpretationSection post={post} />}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
