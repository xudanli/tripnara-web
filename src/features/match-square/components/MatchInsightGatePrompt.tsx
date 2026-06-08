import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { plazaReview } from '../lib/plaza-visual';

interface MatchInsightGatePromptProps {
  className?: string;
}

/** 未登录 / 未完成测评 — 决策翻译占位 */
export function MatchInsightGatePrompt({ className }: MatchInsightGatePromptProps) {
  return (
    <section
      className={cn(plazaReview.card, 'flex items-start gap-3 text-sm', className)}
      aria-label="契合诊断"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <p className="text-muted-foreground">登录并完成测评后查看契合诊断</p>
        <Button size="sm" variant="outline" className="h-8" asChild>
          <Link to="/dashboard/tripnara/odyssey">去完成 Odyssey 入网</Link>
        </Button>
      </div>
    </section>
  );
}
