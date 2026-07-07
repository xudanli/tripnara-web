import { format, isValid, parseISO } from 'date-fns';
import type { WeatherAlert, CurrentWeather } from '@/types/weather';
import type { EnvironmentEventSummary } from '@/types/in-trip-execution';
import type { TripDetail, TripState } from '@/types/trip';

export type ExecuteTodayStatusRiskBadge = {
  label: string;
  variant: 'destructive' | 'warning' | 'outline';
};

export interface ExecuteTodayStatusSnapshot {
  currentTime: string;
  timezoneLabel?: string;
  updatedAt?: string;
  locationLabel?: string;
  weatherRisks?: {
    badges: ExecuteTodayStatusRiskBadge[];
    temperature?: number | null;
    windGust?: number | null;
    visibilityLabel?: string;
  };
  delayMinutes?: number;
}

const ALERT_LABELS: Record<string, string> = {
  wind: '强风预警',
  visibility: '能见度预警',
  cold: '低温预警',
  heat: '高温预警',
};

const DESTINATION_TIMEZONE: Record<string, string> = {
  IS: 'GMT+0',
  GB: 'GMT+0',
  PT: 'GMT+0',
  CN: 'GMT+8',
  JP: 'GMT+9',
  KR: 'GMT+9',
  TH: 'GMT+7',
  SG: 'GMT+8',
};

export function resolveTripTimezoneLabel(destination?: string | null): string | undefined {
  if (!destination) return undefined;
  return DESTINATION_TIMEZONE[destination.trim().toUpperCase()];
}

export function formatVisibilityLabel(visibilityMeters?: number | null): string | undefined {
  if (visibilityMeters == null || visibilityMeters <= 0) return undefined;
  const km = visibilityMeters / 1000;
  if (km < 1) return '目标区能见度较低';
  if (km < 5) return '目标区能见度中等';
  if (km < 10) return '目标区能见度良好';
  return '目标区能见度极佳';
}

function mapAlertToBadge(alert: WeatherAlert): ExecuteTodayStatusRiskBadge {
  return {
    label: ALERT_LABELS[alert.type] ?? alert.title ?? '天气预警',
    variant:
      alert.severity === 'critical'
        ? 'destructive'
        : alert.severity === 'warning'
          ? 'warning'
          : 'outline',
  };
}

function mapEnvironmentEventToBadge(event: EnvironmentEventSummary): ExecuteTodayStatusRiskBadge | null {
  if (event.type !== 'weather') return null;
  const label =
    event.description.length <= 12
      ? event.description
      : event.description.includes('风')
        ? '强风预警'
        : '环境预警';
  return {
    label,
    variant: event.severity === 'red' ? 'destructive' : 'warning',
  };
}

function formatUpdatedAt(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const date = parseISO(iso);
  if (!isValid(date)) return undefined;
  return format(date, 'HH:mm');
}

export function resolveExecuteTodayLocationLabel(
  trip: TripDetail | null | undefined,
  nextStop?: TripState['nextStop'],
): string | undefined {
  if (nextStop) {
    const place =
      nextStop.Place ??
      trip?.TripDay?.flatMap((day) => day.ItineraryItem ?? [])
        .find((item) => item.Place?.id === nextStop.placeId)?.Place;
    if (place?.nameCN && place?.nameEN) return `${place.nameCN} / ${place.nameEN}`;
    if (place?.nameCN) return place.nameCN;
    if (place?.nameEN) return place.nameEN;
    return nextStop.placeName;
  }
  return trip?.destination;
}

export function buildExecuteTodayStatusSnapshot(input: {
  destination?: string | null;
  locationLabel?: string;
  delayMinutes?: number;
  weather?: CurrentWeather | null;
  inTripWeatherSummary?: string | null;
  inTripTemp?: number | null;
  executionAdvisory?: TripExecutionAdvisoryDto | null;
  environmentEvents?: EnvironmentEventSummary[];
  now?: Date;
}): ExecuteTodayStatusSnapshot {
  const now = input.now ?? new Date();
  const timezoneLabel = resolveTripTimezoneLabel(input.destination);
  const delayMinutes = input.executionAdvisory?.currentState.delayMinutes ?? input.delayMinutes ?? 0;

  const badges: ExecuteTodayStatusRiskBadge[] = [];
  for (const alert of input.weather?.alerts ?? []) {
    badges.push(mapAlertToBadge(alert));
  }
  for (const event of input.environmentEvents ?? []) {
    const badge = mapEnvironmentEventToBadge(event);
    if (badge && !badges.some((b) => b.label === badge.label)) {
      badges.push(badge);
    }
  }
  if (badges.length === 0 && input.executionAdvisory?.realtimeRisks.weather) {
    const text = input.executionAdvisory.realtimeRisks.weather;
    badges.push({
      label: text.includes('风') ? '强风预警' : text.slice(0, 8),
      variant: 'warning',
    });
  }

  const temperature =
    input.weather?.temperature ??
    input.inTripTemp ??
    null;
  const windGust =
    input.weather?.metadata?.windGust ??
    input.weather?.windSpeed ??
    null;
  const visibilityLabel =
    formatVisibilityLabel(input.weather?.visibility) ??
    (input.inTripWeatherSummary?.includes('能见度')
      ? input.inTripWeatherSummary
      : undefined);

  const updatedAt =
    formatUpdatedAt(input.weather?.lastUpdated) ??
    formatUpdatedAt(input.executionAdvisory?.evidence.weatherAsOf) ??
    format(now, 'HH:mm');

  const weatherLineParts: string[] = [];
  if (temperature != null) weatherLineParts.push(`${Math.round(temperature)}°C`);
  if (windGust != null) weatherLineParts.push(`阵风 ${Math.round(windGust)} m/s`);

  return {
    currentTime: format(now, 'HH:mm'),
    timezoneLabel,
    updatedAt,
    locationLabel: input.locationLabel,
    weatherRisks:
      badges.length > 0 || weatherLineParts.length > 0 || visibilityLabel
        ? {
            badges,
            temperature,
            windGust,
            visibilityLabel,
          }
        : input.inTripWeatherSummary
          ? {
              badges: [],
              temperature,
              windGust,
              visibilityLabel: input.inTripWeatherSummary,
            }
          : undefined,
    delayMinutes: delayMinutes > 0 ? delayMinutes : undefined,
  };
}
