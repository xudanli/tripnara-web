import { useState, useEffect } from 'react';
import { placesApi } from '@/api/places';
import type { Place } from '@/types/place';
import { handleApiError } from '@/utils/errorHandler';

export const usePlaces = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true);
        const response = await placesApi.getAll();
        setPlaces(response.data.data);
        setError(null);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  return { places, loading, error };
};

