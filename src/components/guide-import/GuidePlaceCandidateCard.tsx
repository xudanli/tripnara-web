import { useEffect, useState } from 'react';
import type { UnderstandingPlaceView, PoiMatchStatus } from '@/types/guide-to-plan-api';
import { placesApi } from '@/api/places';
import { useDebounce } from '@/hooks/useDebounce';
import type { PlaceWithDistance } from '@/types/places-routes';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { Loader2, Search, XCircle } from 'lucide-react';

function confidenceBadgeClass(level: string | undefined): string {
  if (level === 'L1') return 'bg-muted text-muted-foreground';
  if (level === 'L2') return 'bg-muted/15 text-muted-foreground';
  if (level === 'L3') return 'bg-gate-allow text-gate-allow-foreground';
  return 'bg-muted text-muted-foreground';
}

function matchStatusBadge(match: PoiMatchStatus | undefined): { label: string; className: string } | null {
  if (match === 'matched') return { label: '已匹配', className: 'bg-gate-allow text-gate-allow-foreground' };
  if (match === 'ambiguous') return { label: '多候选', className: 'bg-amber-100 text-amber-900' };
  if (match === 'unmatched') return { label: '待匹配', className: 'bg-amber-100 text-amber-900' };
  if (match === 'rejected') return { label: '无需匹配', className: 'bg-muted text-muted-foreground' };
  return null;
}

interface GuidePlaceCandidateCardProps {
  place: UnderstandingPlaceView;
  countryCode?: string | null;
  interactive?: boolean;
  actionPending?: boolean;
  onBindPlace?: (candidateId: string, placeId: number) => Promise<void>;
  onRejectPlace?: (candidateId: string) => Promise<void>;
  compact?: boolean;
  className?: string;
}

export function GuidePlaceCandidateCard({
  place,
  countryCode,
  interactive = false,
  actionPending = false,
  onBindPlace,
  onRejectPlace,
  compact = false,
  className,
}: GuidePlaceCandidateCardProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(place.rawName);
  const [searchResults, setSearchResults] = useState<PlaceWithDistance[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const match = place.matchStatus ?? place.poiMatchStatus;
  const matchBadge = matchStatusBadge(match);
  const canMatch =
    interactive &&
    (match === 'unmatched' || match === 'ambiguous') &&
    onBindPlace &&
    onRejectPlace;

  useEffect(() => {
    if (!searchOpen || debouncedQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setSearchLoading(true);
      try {
        const results = await placesApi.autocompletePlaces({
          q: debouncedQuery.trim(),
          limit: 8,
          countryCode: countryCode?.trim().toUpperCase() || undefined,
        });
        if (!cancelled) setSearchResults(results ?? []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, searchOpen, countryCode]);

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-lg border border-border overflow-hidden bg-card flex flex-col',
        compact ? 'w-[8.75rem]' : 'w-40',
        className,
      )}
    >
      <div className={cn('flex flex-col min-h-0', compact ? 'p-1.5 gap-1' : 'p-2 gap-1.5')}>
        <div className="flex flex-wrap items-center gap-1">
          {place.credibilityLevel && (
            <span
              className={cn(
                'text-[10px] px-1 py-0.5 rounded font-medium leading-none',
                confidenceBadgeClass(place.credibilityLevel),
              )}
            >
              {place.credibilityLevel}
              {match === 'matched' && place.credibilityLevel === 'L3' ? ' 已匹配' : ''}
            </span>
          )}
          {matchBadge && !place.credibilityLevel && (
            <span
              className={cn(
                'text-[10px] px-1 py-0.5 rounded font-medium leading-none',
                matchBadge.className,
              )}
            >
              {matchBadge.label}
            </span>
          )}
          {place.geo && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-muted/15 text-muted-foreground font-medium leading-none">
              可上图
            </span>
          )}
          {matchBadge && place.credibilityLevel && match !== 'matched' && (
            <span
              className={cn(
                'text-[10px] px-1 py-0.5 rounded font-medium leading-none',
                matchBadge.className,
              )}
            >
              {matchBadge.label}
            </span>
          )}
        </div>

        <p className={cn('font-medium leading-snug line-clamp-2', compact ? 'text-[11px]' : 'text-xs')}>
          {place.rawName}
        </p>
        {place.geo?.matchedName && place.geo.matchedName !== place.rawName && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
            → {place.geo.matchedName}
          </p>
        )}

        {canMatch && (
          <div className={cn('flex flex-col', compact ? 'gap-0.5 pt-0.5' : 'gap-1 pt-1')}>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(compact ? 'h-6 text-[10px]' : 'h-7 text-[10px]', 'w-full')}
                  disabled={actionPending}
                >
                  {actionPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3 mr-1" />
                  )}
                  搜索 POI
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="搜索 POI 名称…"
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner className="w-4 h-4" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <CommandEmpty>
                        {debouncedQuery.trim().length < 2 ? '至少输入 2 个字' : '未找到 POI'}
                      </CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {searchResults.map((result) => (
                          <CommandItem
                            key={result.id}
                            value={String(result.id)}
                            onSelect={() => {
                              void onBindPlace(place.id, result.id).then(() => {
                                setSearchOpen(false);
                              });
                            }}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{result.nameCN || result.nameEN}</p>
                              {(result.nameEN || result.address) && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {[result.nameEN, result.address].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                compact ? 'h-6 text-[10px]' : 'h-7 text-[10px]',
                'w-full text-muted-foreground',
              )}
              disabled={actionPending}
              onClick={() => void onRejectPlace(place.id)}
            >
              <XCircle className="w-3 h-3 mr-1" />
              无需匹配
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
