import type { StyleSpecification } from 'mapbox-gl';
import type { HikingOfflinePackBounds } from '@/types/hiking-offline';
import type { OfflineTileFormat } from '@/types/trail-offline';
const SOURCE_ID = 'tripnara-offline-basemap';

function boundsArray(bounds: HikingOfflinePackBounds): [number, number, number, number] {
  return [bounds.west, bounds.south, bounds.east, bounds.north];
}

/** 行中离线底图：栅格 OSM / Mapbox 栅格，或矢量 .pbf（简化图层） */
export function buildOfflineBasemapStyle(
  packKey: string,
  bounds: HikingOfflinePackBounds,
  format: OfflineTileFormat,
  attribution: string
): StyleSpecification {
  if (format === 'vector') {
    return {
      version: 8,
      name: 'Tripnara Offline Vector',
      metadata: { 'tripnara:offline': true },
      sources: {
        [SOURCE_ID]: {
          type: 'vector',
          tiles: [`tripnara-offline://${packKey}/{z}/{x}/{y}.pbf`],
          scheme: 'xyz',
          minzoom: 8,
          maxzoom: 16,
          bounds: boundsArray(bounds),
        },
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: { 'background-color': '#e8eef4' },
        },
        {
          id: 'water',
          type: 'fill',
          source: SOURCE_ID,
          'source-layer': 'water',
          paint: { 'fill-color': '#9ecae8', 'fill-opacity': 0.85 },
        },
        {
          id: 'landcover',
          type: 'fill',
          source: SOURCE_ID,
          'source-layer': 'landcover',
          paint: { 'fill-color': '#d8e8c8', 'fill-opacity': 0.6 },
        },
        {
          id: 'roads',
          type: 'line',
          source: SOURCE_ID,
          'source-layer': 'road',
          paint: {
            'line-color': '#ffffff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 2.5],
          },
        },
        {
          id: 'paths',
          type: 'line',
          source: SOURCE_ID,
          'source-layer': 'path',
          paint: {
            'line-color': '#b45309',
            'line-width': 1.2,
            'line-dasharray': [2, 1],
          },
        },
      ],
    };
  }

  const tileTemplate = `tripnara-offline://${packKey}/{z}/{x}/{y}.png`;

  return {
    version: 8,
    name: 'Tripnara Offline Raster',
    metadata: { 'tripnara:offline': true },
    sources: {
      [SOURCE_ID]: {
        type: 'raster',
        tiles: [tileTemplate],
        scheme: 'xyz',
        tileSize: 256,
        minzoom: 8,
        maxzoom: 16,
        bounds: boundsArray(bounds),
        attribution,
      },
    },
    layers: [
      {
        id: 'basemap-raster',
        type: 'raster',
        source: SOURCE_ID,
        paint: { 'raster-opacity': 1 },
      },
    ],
  };
}
