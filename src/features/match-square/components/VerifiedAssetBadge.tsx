import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedAssetBadgeProps {
  label: string;
  className?: string;
}

/** PRD 3.1.3 · Apple 风格授信高光标签（矢量 + 微弱水印防爬） */
export function VerifiedAssetBadge({ label, className }: VerifiedAssetBadgeProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center gap-1 overflow-hidden rounded-full',
        'border border-gate-allow-border/30 bg-gate-allow-foreground/10 px-2.5 py-0.5',
        'text-xs font-medium text-gate-allow-foreground dark:text-gate-allow-foreground',
        className
      )}
      aria-label={`${label}，已通过平台授信验证`}
    >
      <span
        className="pointer-events-none absolute inset-0 select-none text-[8px] font-bold uppercase tracking-widest text-gate-allow-foreground/10 dark:text-gate-allow-foreground/10"
        aria-hidden
        style={{
          backgroundImage:
            'repeating-linear-gradient(-24deg, transparent, transparent 6px, currentColor 6px, currentColor 7px)',
        }}
      />
      <span className="relative">{label}</span>
      <Check className="relative h-3 w-3 shrink-0 stroke-[2.5]" aria-hidden />
    </span>
  );
}
