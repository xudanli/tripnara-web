import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import type { ContinuePackageCard } from '../api/types';
import { exploreUi } from '../explore-ui';
import { cn } from '@/lib/utils';

interface PackageCardStackProps {
  packages: ContinuePackageCard[];
  rankings: string[];
  valueScores: Record<string, number>;
  trustScores: Record<string, number>;
  onReorder: (next: string[]) => void;
  onScoreChange: (packageId: string, field: 'value' | 'trust', score: number) => void;
}

export function PackageCardStack({
  packages,
  rankings,
  valueScores,
  trustScores,
  onReorder,
  onScoreChange,
}: PackageCardStackProps) {
  const ordered = rankings
    .map((id) => packages.find((p) => p.packageId === id))
    .filter(Boolean) as ContinuePackageCard[];

  const move = (index: number, dir: -1 | 1) => {
    const next = [...rankings];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  };

  return (
    <div className="space-y-1.5">
      {ordered.map((pkg, index) => {
        const value = valueScores[pkg.packageId] ?? 3;
        const trust = trustScores[pkg.packageId] ?? 3;

        return (
          <div
            key={pkg.packageId}
            className={cn('rounded-xl border p-2.5', exploreUi.cardHover)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)] gap-x-3 gap-y-1.5 items-center">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">#{index + 1}</span>
                    <span className="text-xs font-semibold text-foreground truncate">{pkg.title}</span>
                  </div>
                  {pkg.subtitle ? (
                    <p className="text-[11px] text-muted-foreground leading-snug truncate mt-0.5">
                      {pkg.subtitle}
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">价值 ({value})</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={value}
                      onChange={(e) => onScoreChange(pkg.packageId, 'value', Number(e.target.value))}
                      className="w-full h-1.5 accent-foreground"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">信任 ({trust})</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={trust}
                      onChange={(e) => onScoreChange(pkg.packageId, 'trust', Number(e.target.value))}
                      className="w-full h-1.5 accent-foreground"
                    />
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  className="p-0.5 rounded border border-border hover:bg-muted"
                  onClick={() => move(index, -1)}
                  aria-label="上移"
                  disabled={index === 0}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="p-0.5 rounded border border-border hover:bg-muted"
                  onClick={() => move(index, 1)}
                  aria-label="下移"
                  disabled={index === ordered.length - 1}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
