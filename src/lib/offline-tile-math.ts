import type { HikingOfflinePackBounds } from '@/types/hiking-offline';

export type TileCoord = { z: number; x: number; y: number };

/** Web Mercator：经纬度 → tile XY（XYZ） */
export function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

export function boundsToTileRange(
  bounds: HikingOfflinePackBounds,
  z: number
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const nw = lngLatToTile(bounds.west, bounds.north, z);
  const se = lngLatToTile(bounds.east, bounds.south, z);
  return {
    xMin: Math.min(nw.x, se.x),
    xMax: Math.max(nw.x, se.x),
    yMin: Math.min(nw.y, se.y),
    yMax: Math.max(nw.y, se.y),
  };
}

export function enumerateTilesInBounds(
  bounds: HikingOfflinePackBounds,
  zooms: number[],
  maxTiles = 600
): TileCoord[] {
  const out: TileCoord[] = [];
  const seen = new Set<string>();
  const sortedZooms = [...zooms].sort((a, b) => a - b);

  for (const z of sortedZooms) {
    const { xMin, xMax, yMin, yMax } = boundsToTileRange(bounds, z);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const key = `${z}/${x}/${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ z, x, y });
        if (out.length >= maxTiles) return out;
      }
    }
  }
  return out;
}

export function formatTileTemplate(
  templateUrl: string,
  z: number,
  x: number,
  y: number
): string {
  return templateUrl
    .replace(/\{z\}/gi, String(z))
    .replace(/\{x\}/gi, String(x))
    .replace(/\{y\}/gi, String(y))
    .replace(/\{s\}/gi, 'a');
}
