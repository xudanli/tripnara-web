import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DestinationRegionOption } from '@/types/match-square';
import {
  resolveDestinationScopeFromIds,
  resolveDestinationRegions,
} from '../lib/destination-options';
import { searchMapboxPlaces, type GeocodeSuggestion } from '../lib/mapbox-geocode';
import { isMapboxConfigured } from '@/lib/mapbox-token';

export type DestinationSelection = {
  destination: string;
  destinationScope?: string;
  destinationRegionId?: string;
  destinationSubScopeId?: string;
  coordinates?: { lat: number; lng: number };
};

interface DestinationPickerProps {
  value: DestinationSelection;
  onChange: (next: DestinationSelection) => void;
  /** GET /filters/options → destinationRegions；缺省用 clarify 兜底 */
  destinationRegions?: DestinationRegionOption[];
  onRegionEdited?: () => void;
  onSubScopeEdited?: () => void;
  onDestinationEdited?: () => void;
  error?: string;
}

function scopeFromSelection(
  regions: DestinationRegionOption[],
  regionId: string,
  subId: string,
  customDraft?: string
): DestinationSelection {
  const scope = resolveDestinationScopeFromIds(regions, regionId, subId, customDraft);
  return {
    destination: scope,
    destinationScope: scope,
    destinationRegionId: regionId,
    destinationSubScopeId: subId,
    coordinates: undefined,
  };
}

export function DestinationPicker({
  value,
  onChange,
  destinationRegions,
  onRegionEdited,
  onSubScopeEdited,
  onDestinationEdited,
  error,
}: DestinationPickerProps) {
  const regions = useMemo(
    () => resolveDestinationRegions(destinationRegions),
    [destinationRegions]
  );

  const [regionId, setRegionId] = useState(value.destinationRegionId ?? '');
  const [subId, setSubId] = useState(value.destinationSubScopeId ?? '');
  const [customDraft, setCustomDraft] = useState(
    value.destinationRegionId === 'custom' ? value.destination : ''
  );
  const [mapQuery, setMapQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (value.destinationRegionId != null) {
      setRegionId(value.destinationRegionId);
    }
    if (value.destinationSubScopeId != null) {
      setSubId(value.destinationSubScopeId);
    }
    if (value.destinationRegionId === 'custom' && value.destination) {
      setCustomDraft(value.destination);
    }
  }, [value.destinationRegionId, value.destinationSubScopeId, value.destination]);

  const handleRegionChange = (id: string) => {
    setRegionId(id);
    onRegionEdited?.();
    const region = regions.find((r) => r.id === id);
    const first = region?.subScopes[0];
    const nextSub = first?.id ?? 'custom';
    setSubId(nextSub);
    if (id !== 'custom') {
      onChange(scopeFromSelection(regions, id, nextSub));
    }
  };

  const handleSubChange = (nextSub: string) => {
    setSubId(nextSub);
    onSubScopeEdited?.();
    onChange(scopeFromSelection(regions, regionId, nextSub));
  };

  const handleMapSearch = async (query: string) => {
    setMapQuery(query);
    if (!query.trim() || !isMapboxConfigured()) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchMapboxPlaces(query);
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const applyCustom = () => {
    const dest = customDraft.trim();
    if (!dest) return;
    onDestinationEdited?.();
    onChange({
      destination: dest,
      destinationScope: dest,
      destinationRegionId: 'custom',
      destinationSubScopeId: undefined,
      coordinates: undefined,
    });
  };

  const applySuggestion = (s: GeocodeSuggestion) => {
    onDestinationEdited?.();
    onChange({
      destination: s.label,
      destinationScope: s.placeName,
      destinationRegionId: 'custom',
      destinationSubScopeId: undefined,
      coordinates: s.coordinates,
    });
    setMapQuery(s.placeName);
    setSuggestions([]);
  };

  const activeRegion = regions.find((r) => r.id === regionId) ?? regions[0];
  const subs = activeRegion?.subScopes ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>目的地大区 *</Label>
          <Select value={regionId || undefined} onValueChange={handleRegionChange}>
            <SelectTrigger>
              <SelectValue placeholder="请选择，或由 AI 根据愿景解析" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {regionId && regionId !== 'custom' && subs.length > 0 && (
          <div className="space-y-2">
            <Label>细分范围</Label>
            <Select value={subId || undefined} onValueChange={handleSubChange}>
              <SelectTrigger>
                <SelectValue placeholder="请选择细分范围" />
              </SelectTrigger>
              <SelectContent>
                {subs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {regionId === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="custom-dest">手动输入目的地</Label>
          <div className="flex gap-2">
            <Input
              id="custom-dest"
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              placeholder="如 西藏阿里、南疆"
            />
            <Button type="button" variant="secondary" onClick={applyCustom}>
              确认
            </Button>
          </div>
        </div>
      )}

      {isMapboxConfigured() && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            地图精确选点（可选）
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={mapQuery}
              onChange={(e) => handleMapSearch(e.target.value)}
              className="pl-9"
              placeholder="搜索 POI 或城市，如 莫高窟、雷克雅未克"
            />
          </div>
          {searching && <p className="text-xs text-muted-foreground">搜索中…</p>}
          {suggestions.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border bg-popover text-sm shadow-md">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-accent',
                      value.destinationScope === s.placeName && 'bg-accent'
                    )}
                    onClick={() => applySuggestion(s)}
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.placeName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {value.destination && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          已选：<span className="font-medium text-foreground">{value.destinationScope ?? value.destination}</span>
          {value.coordinates && (
            <span className="ml-2 text-xs">
              ({value.coordinates.lat.toFixed(4)}, {value.coordinates.lng.toFixed(4)})
            </span>
          )}
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
