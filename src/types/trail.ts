import type { BaseEntity, Coordinates } from './common';

export interface Trail extends BaseEntity {
  name: string;
  description: string;
  startPoint: Coordinates;
  endPoint: Coordinates;
  distance: number; // in kilometers
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
  estimatedDuration: number; // in hours
  elevationGain?: number; // in meters
  images?: string[];
}

