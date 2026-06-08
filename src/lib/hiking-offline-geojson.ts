import type { HikingOfflinePackBounds } from '@/types/hiking-offline';
import type { SupplyPoi } from '@/types/hiking';
import { supplyPoiMarkerColor } from '@/lib/map-geo';
import type { TrailOfflineMapMarker } from '@/types/trail-offline';

export function parseRouteLineFromGeojson(
  geojson: GeoJSON.FeatureCollection
): Array<{ lat: number; lng: number }> {
  const line = geojson.features.find(
    (f) =>
      f.properties?.role === 'route' &&
      f.geometry?.type === 'LineString'
  );
  if (!line || line.geometry.type !== 'LineString') return [];
  const coords = line.geometry.coordinates;
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

export function parseSupplyPoisFromGeojson(
  geojson: GeoJSON.FeatureCollection
): SupplyPoi[] {
  return geojson.features
    .filter((f) => f.properties?.role === 'poi' && f.geometry?.type === 'Point')
    .map((f) => {
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      const p = f.properties ?? {};
      return {
        id: String(p.id ?? p.nameCN ?? lat),
        nameCN: String(p.nameCN ?? p.name ?? 'POI'),
        nameEN: p.nameEN as string | undefined,
        lat,
        lng,
        subCategory: String(p.subCategory ?? 'OTHER'),
        role: p.role as string | undefined,
        elevation_m: p.elevation_m as number | undefined,
      } satisfies SupplyPoi;
    });
}

export function mapMarkersFromSupplyPois(pois: SupplyPoi[]): TrailOfflineMapMarker[] {
  return pois.map((p) => ({
    id: p.id,
    lng: p.lng,
    lat: p.lat,
    label: p.nameCN,
    color: supplyPoiMarkerColor(p.subCategory),
  }));
}

export function lineCoordinatesFromPolyline(
  polyline: Array<{ lat: number; lng: number }>
): Array<[number, number]> {
  return polyline.map((p) => [p.lng, p.lat] as [number, number]);
}

/** Leaflet fitBounds: [[south, west], [north, east]] */
export function mapBoundsForLeaflet(
  b: HikingOfflinePackBounds
): [[number, number], [number, number]] {
  return [
    [b.south, b.west],
    [b.north, b.east],
  ];
}
