import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { plazaReview } from '../lib/plaza-visual';

interface MatchInsightPendingProps {
  compatibilityPercent: number;
  className?: string;
}

/** 已有契合度 % 但 matchInsightDrawer 尚未就绪 */
export function MatchInsightPending({ compatibilityPercent, className }: MatchInsightPendingProps) {
  return (
    <section
      className={cn(plazaReview.card, 'flex items-start gap-3 text-sm', className)}
      aria-label="契合诊断"
      aria-busy="true"
    >
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          契合度 {compatibilityPercent}% · 完整诊断生成中
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Match Engine 正在对比你与队长的团队结构维度，稍后可展开查看决策翻译全文。
        </p>
      </div>
    </section>
  );
}
