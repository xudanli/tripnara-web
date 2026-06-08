import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecruitmentPostCard } from '@/types/match-square';
import { sanitizeVibeBudgetCopy } from '../lib/vibe-budget-coherence';
import { plazaDetail } from '../lib/plaza-visual';

interface ContractInterpretationSectionProps {
  post: RecruitmentPostCard;
  className?: string;
}

/** 契约解读 — 仅 AI contractHint；门槛/胶囊/组队风格由概览 Hard Gates 承担 */
export function ContractInterpretationSection({
  post,
  className,
}: ContractInterpretationSectionProps) {
  const raw = post.vibeLlm?.contractHint;
  if (!raw?.trim()) return null;

  const contractHint = sanitizeVibeBudgetCopy(raw, post);
  if (!contractHint.trim()) return null;

  const paragraphs = contractHint
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className={cn(className)} aria-label="契约解读">
      <div className="flex items-center gap-1.5">
        <Scale className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden />
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          契约解读
        </h2>
      </div>
      <div
        className={cn(
          'mt-2 space-y-2 border-l-2 border-[var(--gate-allow-border)] pl-3',
          plazaDetail.sectionBody
        )}
      >
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

/** @deprecated 使用 ContractInterpretationSection */
export const VibeLlmDetailSection = ContractInterpretationSection;
