import { useEffect, useMemo } from 'react';

interface TripJsonLdInput {
  destination: string;
  startDate: string;
  endDate: string;
  days?: Array<{
    date: string;
    items?: Array<{ type?: string; startTime?: string; placeName?: string }>;
  }>;
}

export function buildTripShareJsonLd(trip: TripJsonLdInput): Record<string, unknown> {
  const itemList =
    trip.days?.map((day, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: day.date,
      item: {
        '@type': 'ItemList',
        numberOfItems: day.items?.length ?? 0,
        itemListElement:
          day.items?.map((item, itemIndex) => ({
            '@type': 'ListItem',
            position: itemIndex + 1,
            name: item.placeName ?? item.type ?? 'Activity',
            ...(item.startTime ? { startDate: item.startTime } : {}),
          })) ?? [],
      },
    })) ?? [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Trip',
    name: `${trip.destination} 行程`,
    touristType: 'Leisure',
    itinerary: {
      '@type': 'ItemList',
      numberOfItems: itemList.length,
      itemListElement: itemList,
    },
    ...(trip.startDate ? { startDate: trip.startDate.split('T')[0] } : {}),
    ...(trip.endDate ? { endDate: trip.endDate.split('T')[0] } : {}),
  };
}

export interface TripJsonLdScriptProps {
  trip: TripJsonLdInput;
  /** 后端 schema_org_discovery 提供的 JSON-LD 优先于客户端投影 */
  jsonLdOverride?: Record<string, unknown> | Record<string, unknown>[] | null;
}

export function TripJsonLdScript({ trip, jsonLdOverride }: TripJsonLdScriptProps) {
  const jsonLd = useMemo(() => {
    if (jsonLdOverride && typeof jsonLdOverride === 'object') {
      return jsonLdOverride;
    }
    return buildTripShareJsonLd(trip);
  }, [trip, jsonLdOverride]);

  useEffect(() => {
    const scriptId = 'tripnara-trip-json-ld';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      script?.remove();
    };
  }, [jsonLd]);

  return null;
}
