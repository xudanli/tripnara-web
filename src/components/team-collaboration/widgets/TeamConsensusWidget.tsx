import { Progress } from '@/components/ui/progress';
import type { CollabConsensusDimension } from '@/hooks/useCollabOverview';
import { CollabMetricRing } from './CollabMetricRing';
import { CollabWidgetCard } from './CollabWidgetCard';

interface TeamConsensusWidgetProps {
  overall: number;
  dimensions: CollabConsensusDimension[];
  onDimensionClick?: (key: string) => void;
}

export function TeamConsensusWidget({
  overall,
  dimensions,
  onDimensionClick,
}: TeamConsensusWidgetProps) {
  return (
    <CollabWidgetCard title="团队共识概览" description="基于画像与协商进度估算">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <CollabMetricRing value={overall} size={112} label="团队共识" />
        <ul className="min-w-0 flex-1 space-y-2">
          {dimensions.map((dim) => (
            <li key={dim.key}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onDimensionClick?.(dim.key)}
                disabled={!onDimensionClick}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{dim.label}</span>
                  <span className="tabular-nums font-medium text-foreground">{dim.score}%</span>
                </div>
                <Progress value={dim.score} className="h-1.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </CollabWidgetCard>
  );
}
