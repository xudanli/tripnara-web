export const ROUTES = {
  HOME: '/',
  TRIPS: '/trips',
  TRIP_DETAIL: (id: string) => `/trips/${id}`,
  PLACES: '/places',
  PLACE_DETAIL: (id: string) => `/places/${id}`,
  HOTELS: '/hotels',
  HOTEL_DETAIL: (id: string) => `/hotels/${id}`,
  TRAILS: '/trails',
  TRAIL_DETAIL: (id: string) => `/trails/${id}`,
} as const;

