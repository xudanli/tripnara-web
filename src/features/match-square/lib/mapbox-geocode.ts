import { getMapboxAccessToken } from '@/lib/mapbox-token';

export type GeocodeSuggestion = {
  id: string;
  label: string;
  placeName: string;
  coordinates: { lat: number; lng: number };
};

export async function searchMapboxPlaces(
  query: string,
  signal?: AbortSignal
): Promise<GeocodeSuggestion[]> {
  const token = getMapboxAccessToken();
  const q = query.trim();
  if (!token || q.length < 2) return [];

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
  );
  url.searchParams.set('access_token', token);
  url.searchParams.set('language', 'zh');
  url.searchParams.set('limit', '6');
  url.searchParams.set('types', 'region,place,poi,locality');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    features?: Array<{
      id: string;
      place_name: string;
      text: string;
      center: [number, number];
    }>;
  };

  return (data.features ?? []).map((f) => ({
    id: f.id,
    label: f.text,
    placeName: f.place_name,
    coordinates: { lat: f.center[1], lng: f.center[0] },
  }));
}
