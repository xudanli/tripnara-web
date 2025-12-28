import type { BaseEntity, Location } from './common';

export interface Place extends BaseEntity {
  name: string;
  description: string;
  location: Location;
  category: 'attraction' | 'restaurant' | 'shopping' | 'entertainment' | 'other';
  rating?: number;
  images?: string[];
}

