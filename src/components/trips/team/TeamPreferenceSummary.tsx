import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PreferenceSummaryItem } from '@/lib/team-tab-model';
import { cn } from '@/lib/utils';

interface TeamPreferenceSummaryProps {
  items: PreferenceSummaryItem[];
  defaultOpen?: boolean;
  hidden?: boolean;
}

export default function TeamPreferenceSummary({
  items,
  defaultOpen = false,
  hidden = false,
}: TeamPreferenceSummaryProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (hidden) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              团队整体偏好
            </CardTitle>
            <CardDescription className="text-sm">
              综合大家的设置，看整体更偏悠闲还是紧凑（只读参考）
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 h-8 px-2" onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className={cn('font-medium', levelColor(item.level))}>{item.level}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : (
        <CardContent className="pt-0 pb-4">
          <p className="text-xs text-muted-foreground">
            展开查看节奏、预算、安全等维度的综合倾向
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function levelColor(level: string): string {
  if (level === '极高') return 'text-muted-foreground dark:text-muted-foreground';
  if (level === '高') return 'text-amber-600 dark:text-amber-400';
  if (level === '中') return 'text-foreground';
  return 'text-muted-foreground';
}
