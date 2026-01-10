import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadinessScore } from '@/types/readiness';

interface BreakdownBarListProps {
  score: ReadinessScore;
  onShowBlockers?: (dimension: string) => void;
}

const dimensions = [
  { key: 'evidenceCoverage', label: 'Evidence Coverage', description: '证据覆盖' },
  { key: 'scheduleFeasibility', label: 'Schedule Feasibility', description: '排程可行' },
  { key: 'transportCertainty', label: 'Transport Certainty', description: '交通确定性' },
  { key: 'safetyRisk', label: 'Safety & Risk', description: '安全风险' },
  { key: 'buffers', label: 'Buffers', description: '缓冲冗余' },
] as const;

export default function BreakdownBarList({ score, onShowBlockers }: BreakdownBarListProps) {
  return (
    <div className="space-y-4">
      {dimensions.map((dim) => {
        const value = score[dim.key];

        return (
          <div key={dim.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{dim.label}</div>
                <div className="text-xs text-muted-foreground">{dim.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-sm font-semibold',
                  value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {value}%
                </span>
                {onShowBlockers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => onShowBlockers(dim.key)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Show blockers
                  </Button>
                )}
              </div>
            </div>
            <Progress value={value} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}


