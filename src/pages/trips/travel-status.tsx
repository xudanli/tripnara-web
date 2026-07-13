import { Navigate, useParams, useSearchParams } from 'react-router-dom';

/** /trips/:id/travel → /trips/:id（规划 Tab） */
export default function TripTravelStatusRedirectPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  if (!id) {
    return <Navigate to="/dashboard/trips" replace />;
  }
  const next = new URLSearchParams(searchParams);
  next.delete('tab');
  next.delete('statusSection');
  const query = next.toString();
  return <Navigate to={`/dashboard/trips/${id}${query ? `?${query}` : ''}`} replace />;
}
