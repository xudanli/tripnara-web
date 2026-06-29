import { useEffect, useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { placesApi } from '@/api/places';
import { useDebounce } from '@/hooks/useDebounce';
import type { PlaceWithDistance } from '@/types/places-routes';
import type { MustGoPlaceSummary } from './constraint-console-view.util';

export interface MustGoPlacesEditorProps {
  places: MustGoPlaceSummary[];
  destination?: string;
  onChange: (places: MustGoPlaceSummary[]) => void;
  className?: string;
}

/** 必去地点 · 内联搜索添加/移除 */
export function MustGoPlacesEditor({
  places,
  destination,
  onChange,
  className,
}: MustGoPlacesEditorProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceWithDistance[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2 || !searchOpen) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setSearchLoading(true);
      try {
        const results = await placesApi.autocompletePlaces({
          q: debouncedQuery,
          limit: 10,
          countryCode: destination,
        });
        if (!cancelled) setSearchResults(results);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, searchOpen, destination]);

  const placeIds = new Set(places.map((p) => p.id));

  const handleAdd = (place: PlaceWithDistance) => {
    if (placeIds.has(place.id)) return;
    onChange([
      ...places,
      {
        id: place.id,
        name: place.nameCN || place.nameEN || `地点 #${place.id}`,
        inItinerary: false,
      },
    ]);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleRemove = (id: number) => {
    onChange(places.filter((p) => p.id !== id));
  };

  return (
    <div className={className}>
      {places.length > 0 ? (
        <ul className="space-y-2">
          {places.map((place) => (
            <li
              key={place.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{place.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {place.inItinerary ? '已入行程' : '待安排进行程'}
                </p>
              </div>
              {place.inItinerary ? (
                <Badge variant="outline" className="h-5 shrink-0 text-[10px] font-normal">
                  已锁定
                </Badge>
              ) : (
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label={`移除 ${place.name}`}
                  onClick={() => handleRemove(place.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          尚未设置必去地点，请搜索并添加希望在行程中必到的 POI。
        </p>
      )}

      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 w-full justify-start text-xs font-normal"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            搜索并添加地点
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="输入地点名称（至少 2 个字）"
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {searchLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner className="h-4 w-4" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {searchQuery.length < 2 ? '继续输入以搜索' : '未找到匹配地点'}
                  </CommandEmpty>
                  <CommandGroup>
                    {searchResults.map((place) => {
                      const added = placeIds.has(place.id);
                      return (
                        <CommandItem
                          key={place.id}
                          value={`${place.nameCN} ${place.nameEN} ${place.id}`}
                          disabled={added}
                          onSelect={() => handleAdd(place)}
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">
                              {place.nameCN || place.nameEN}
                            </div>
                            {place.nameEN && place.nameCN ? (
                              <div className="truncate text-xs text-muted-foreground">
                                {place.nameEN}
                              </div>
                            ) : null}
                          </div>
                          {added ? (
                            <Badge variant="outline" className="text-[10px]">
                              已添加
                            </Badge>
                          ) : null}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
