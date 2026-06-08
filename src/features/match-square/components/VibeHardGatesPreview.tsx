import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VibeHardGates } from '@/types/vibe-llm';
import { buildVibeHardGatesPreviewLines } from '../lib/vibe-llm/teamwork-labels';
import { plazaChip } from '../lib/plaza-visual';

interface VibeHardGatesPreviewProps {
  hardGates?: VibeHardGates;
  formBudget?: { min?: number; max?: number };
  className?: string;
}

/** 发布页 · Vibe 解析硬门槛预览（Medium 仅展示，不阻断申请） */
export function VibeHardGatesPreview({ hardGates, formBudget, className }: VibeHardGatesPreviewProps) {
  const lines = buildVibeHardGatesPreviewLines(hardGates, formBudget);
  if (!lines.length) return null;

  return (
    <div className={cn('rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5', className)}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Shield className="h-3.5 w-3.5" aria-hidden />
        硬门槛预览
      </p>
      <div className="flex flex-wrap gap-1.5">
        {lines.map((line) => (
          <span key={line} className={plazaChip.gate}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
