import type { BaseEntity, Location } from './common';

export interface Trip extends BaseEntity {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: Location;
  places: string[]; // Place IDs
  hotels: string[]; // Hotel IDs
  trails: string[]; // Trail IDs
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
}

