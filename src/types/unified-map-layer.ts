/** tripnara.unified_map_layer@v1 — 规划 SUCCESS 多图层地图 */
export type UnifiedMapPointKind =
  | 'poi'
  | 'hotel_depot'
  | 'car_pickup'
  | 'car_dropoff'
  | (string & {});

export interface UnifiedMapPoint {
  id?: string;
  kind: UnifiedMapPointKind;
  lat: number;
  lng: number;
  label_zh?: string;
  night_index?: number;
  day_index?: number;
  [key: string]: unknown;
}

export interface UnifiedMapLeg {
  id?: string;
  from_point_id?: string;
  to_point_id?: string;
  from_index?: number;
  to_index?: number;
  kind?: string;
  label_zh?: string;
  /** 折线坐标 [lng, lat][] */
  coordinates?: [number, number][];
  [key: string]: unknown;
}

export interface UnifiedMapLayerPayload {
  schema: 'tripnara.unified_map_layer@v1';
  headline_zh?: string;
  summary_zh?: string;
  overview_directions_url?: string;
  points: UnifiedMapPoint[];
  legs?: UnifiedMapLeg[];
  [key: string]: unknown;
}

export function isUnifiedMapLayerPayload(v: unknown): v is UnifiedMapLayerPayload {
  return (
    v != null &&
    typeof v === 'object' &&
    (v as UnifiedMapLayerPayload).schema === 'tripnara.unified_map_layer@v1' &&
    Array.isArray((v as UnifiedMapLayerPayload).points)
  );
}
