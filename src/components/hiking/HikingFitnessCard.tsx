import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Pencil } from 'lucide-react';
import { FitnessQuestionnaireDialog } from '@/components/fitness/FitnessQuestionnaireDialog';
import { useLongestHike } from '@/hooks/useLongestHike';
import { useFitnessContext } from '@/contexts/FitnessContext';

const LONGEST_HIKE_LABELS: Record<number, string> = {
  0: '未有多日徒步经验',
  1: '最长连续 1 天',
  2: '最长连续 2 天',
  3: '最长连续 3 天',
  4: '最长连续 4 天及以上',
};

type HikingFitnessCardProps = {
  /** 问卷完成后刷新 Readiness / 详情等 */
  onUpdated?: () => void;
  className?: string;
  compact?: boolean;
};

export function HikingFitnessCard({
  onUpdated,
  className,
  compact = false,
}: HikingFitnessCardProps) {
  const [open, setOpen] = useState(false);
  const { longestHike, hasQueryOverride, fromProfile } = useLongestHike();
  const { hasCompletedAssessment, refetch } = useFitnessContext();

  const label = LONGEST_HIKE_LABELS[longestHike] ?? `档位 ${longestHike}`;

  const handleComplete = () => {
    setOpen(false);
    void refetch();
    onUpdated?.();
  };

  if (compact) {
    return (
      <>
        <div className={`flex flex-wrap items-center gap-2 text-sm ${className ?? ''}`}>
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span>
            体能档位：<strong>{label}</strong>
            {hasQueryOverride && (
              <span className="text-xs text-muted-foreground ml-1">（URL 覆盖）</span>
            )}
          </span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpen(true)}>
            <Pencil className="h-3 w-3 mr-1" />
            更新问卷
          </Button>
        </div>
        <FitnessQuestionnaireDialog
          open={open}
          onOpenChange={setOpen}
          onComplete={handleComplete}
          trigger="manual"
        />
      </>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            体能问卷（徒步）
          </CardTitle>
          <CardDescription>
            最长连续徒步天数来自体能 profile，影响路线详情与日节奏（longestHike 0–4）。
            可用 URL <code className="text-xs">?longestHike=</code> 临时覆盖。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">当前档位</span>
              <Badge variant="secondary">{longestHike}</Badge>
              {hasQueryOverride && <Badge variant="outline">URL 覆盖</Badge>}
            </div>
            <p className="text-sm font-medium">{label}</p>
            {!hasCompletedAssessment && fromProfile == null && !hasQueryOverride && (
              <p className="text-xs text-amber-700">尚未完成问卷，当前使用默认档位 2</p>
            )}
          </div>
          <Button variant="outline" onClick={() => setOpen(true)}>
            {!hasCompletedAssessment ? '填写问卷' : '重新评估'}
          </Button>
        </CardContent>
      </Card>

      <FitnessQuestionnaireDialog
        open={open}
        onOpenChange={setOpen}
        onComplete={handleComplete}
        trigger="manual"
      />
    </>
  );
}
