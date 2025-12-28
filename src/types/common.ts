export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  address: string;
  city: string;
  country: string;
  coordinates: Coordinates;
}

