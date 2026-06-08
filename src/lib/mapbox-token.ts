/** Mapbox token（兼容 VITE_MAPBOX_ACCESS_TOKEN / VITE_MAPBOX_TOKEN） */
export function getMapboxAccessToken(): string {
  return (
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
    import.meta.env.VITE_MAPBOX_TOKEN ||
    ''
  );
}

export function isMapboxConfigured(): boolean {
  return Boolean(getMapboxAccessToken());
}
