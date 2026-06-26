import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useTeamDecisionProfiling } from '@/hooks/useDecisionProfiling';

interface TeamStyleWallProps {
  tripId: string;
}

export function TeamStyleWall({ tripId }: TeamStyleWallProps) {
  const { travelStyles, moneyDna, loading } = useTeamDecisionProfiling(tripId);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (travelStyles.length === 0 && moneyDna.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">团队成员完成调查后将显示脱敏风格墙</p>
    );
  }

  return (
    <div className="space-y-4">
      {travelStyles.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            旅行风格
          </p>
          <ul className="space-y-2">
            {travelStyles.map((m) => (
              <li key={m.userId} className="rounded-md border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.displayName}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {m.styleLabel}
                  </Badge>
                </div>
                {m.compatibilityHints.length > 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">{m.compatibilityHints[0]}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {moneyDna.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
            <Users className="h-3 w-3" />
            消费相似度（相对你）
          </p>
          <ul className="space-y-1.5">
            {moneyDna.map((m) => (
              <li key={m.userId} className="flex items-center justify-between text-sm px-1">
                <span>{m.displayName}</span>
                <span className="tabular-nums font-medium">{m.styleSimilarityPct}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
