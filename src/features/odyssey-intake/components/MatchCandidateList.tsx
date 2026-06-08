import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { CompanionMatch } from '@/types/odyssey-intake';
import {
  companionAvatarInitial,
  formatMatchCompatibilityPercent,
  resolveCompanionDisplayName,
} from '../lib/normalize-companion-match';

interface MatchCandidateListProps {
  matches: CompanionMatch[];
}

export function MatchCandidateList({ matches }: MatchCandidateListProps) {
  if (matches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">暂无契合搭子推荐，稍后再来看看</p>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const displayName = resolveCompanionDisplayName(match);
        const compatPercent = formatMatchCompatibilityPercent(match.compatibilityScore);

        return (
          <Card key={match.userId} className="overflow-hidden">
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar className="h-12 w-12">
                {match.avatarUrl && <AvatarImage src={match.avatarUrl} alt={displayName} />}
                <AvatarFallback>{companionAvatarInitial(match)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{displayName}</span>
                  <Badge variant="secondary" className="text-xs tabular-nums">
                    {compatPercent}% 契合
                  </Badge>
                </div>
                {match.cardTitle && match.cardTitle !== displayName && (
                  <p className="truncate text-sm text-muted-foreground">{match.cardTitle}</p>
                )}
                {(match.destination || match.dateRange) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[match.destination, match.dateRange].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <Badge variant="outline">{match.mbtiType}</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
