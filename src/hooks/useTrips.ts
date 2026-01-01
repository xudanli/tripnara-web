import { useState, useEffect } from 'react';
import { tripsApi } from '@/api/trips';
import type { TripListItem } from '@/types/trip';
import { handleApiError } from '@/utils/errorHandler';

export const useTrips = () => {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const data = await tripsApi.getAll();
        setTrips(data);
        setError(null);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  return { trips, loading, error };
};

