import type { BaseEntity, Location } from './common';

export interface Hotel extends BaseEntity {
  name: string;
  description: string;
  location: Location;
  rating?: number;
  pricePerNight?: number;
  amenities?: string[];
  images?: string[];
}

