import type { ChatRequestContext } from '@/api/planning-assistant-v2';

/** 从 trip.destination（如 `IS,Iceland`）解析 ISO 3166-1 alpha-2 国家码 */
export function extractCountryCodeFromDestination(destination?: string | null): string | undefined {
  if (!destination?.trim()) return undefined;
  const part = destination.split(',')[0]?.trim().toUpperCase() ?? '';
  return /^[A-Z]{2}$/.test(part) ? part : undefined;
}

export function buildPlanningAssistantV2Context(options: {
  tripId: string;
  destination?: string | null;
  userCountryCode?: string;
  timezone?: string;
  currentLocation?: { lat: number; lng: number };
}): ChatRequestContext {
  const countryCode = extractCountryCodeFromDestination(options.destination);
  return {
    tripId: options.tripId,
    ...(countryCode ? { countryCode } : {}),
    ...(options.userCountryCode ? { userCountryCode: options.userCountryCode } : {}),
    ...(options.timezone ? { timezone: options.timezone } : {}),
    ...(options.currentLocation ? { currentLocation: options.currentLocation } : {}),
  };
}
