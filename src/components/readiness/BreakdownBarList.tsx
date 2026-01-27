import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { ReadinessScore } from '@/types/readiness';

interface BreakdownBarListProps {
  score: ReadinessScore;
  onShowBlockers?: (dimension: string) => void;
}

const dimensionKeys = [
  'evidenceCoverage',
  'scheduleFeasibility',
  'transportCertainty',
  'safetyRisk',
  'buffers',
] as const;

export default function BreakdownBarList({ score, onShowBlockers }: BreakdownBarListProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {dimensionKeys.map((key) => {
        const value = score[key];

        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">
                  {t(`dashboard.readiness.page.dimensions.${key}.label`)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t(`dashboard.readiness.page.dimensions.${key}.description`)}
                </div>
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
                    onClick={() => onShowBlockers(key)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {t('dashboard.readiness.page.showBlockers')}
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
