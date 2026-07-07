import { motion } from 'framer-motion';
import { Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VibeSlotDefinition } from '@/types/vibe-llm';

interface VibePuzzlePreviewProps {
  slots: VibeSlotDefinition[];
  slotsNeeded: number;
  className?: string;
}

/** 发布页实时车队拼图预览 — 来自 LLM slot_definitions */
export function VibePuzzlePreview({ slots, slotsNeeded, className }: VibePuzzlePreviewProps) {
  const visible = slots.slice(0, slotsNeeded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border border-border/80 bg-muted/30 p-3', className)}
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Puzzle className="h-3.5 w-3.5" aria-hidden />
        车队拼图进度 · AI 建议补位
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
          🧑‍✈️ 队长（你）
        </span>
        {visible.map((slot, index) => (
          <span key={slot.slot_id} className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground/50" aria-hidden>
              +
            </span>
            <motion.span
              key={slot.expected_tag}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="inline-flex max-w-[220px] items-center rounded-md border border-dashed border-gate-allow-border/40 bg-gate-allow-foreground/5 px-2 py-1 text-xs text-gate-allow-foreground dark:text-gate-allow-foreground"
              title={slot.reason}
            >
              🧩 建议补位 · {slot.expected_tag}
            </motion.span>
          </span>
        ))}
        {visible.length === 0 &&
          Array.from({ length: slotsNeeded }).map((_, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground"
            >
              虚位以待 · 旅伴拼图位 {i + 1}
            </span>
          ))}
      </div>
    </motion.div>
  );
}
