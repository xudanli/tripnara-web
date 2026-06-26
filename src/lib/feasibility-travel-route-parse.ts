export function parseTravelRouteFromMessage(message: string): {
  fromPlaceLabel: string;
  toPlaceLabel: string;
  dayNumber?: number;
  distanceMeters?: number;
} | null {
  const dayMatch = message.match(/第\s*(\d+)\s*天/);
  const dotRoute = message.match(/·\s*([^·→]+?)\s*(?:→|->)\s*([^·(（]+)/);
  const routeMatch =
    dotRoute ?? message.match(/([^·→]+?)\s*(?:→|->)\s*([^·(（]+)/);
  if (!routeMatch) return null;

  const fromPlaceLabel = routeMatch[1]
    .replace(/^第\s*\d+\s*天\s*/i, '')
    .trim();
  const toPlaceLabel = routeMatch[2].trim();
  const kmMatch = message.match(/约\s*([\d.,]+)\s*km/i);
  const distanceMeters = kmMatch
    ? Math.round(parseFloat(kmMatch[1].replace(',', '')) * 1000)
    : undefined;

  return {
    fromPlaceLabel,
    toPlaceLabel,
    dayNumber: dayMatch ? Number(dayMatch[1]) : undefined,
    distanceMeters,
  };
}
