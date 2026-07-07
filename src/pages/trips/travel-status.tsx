import { Navigate, useParams, useSearchParams } from 'react-router-dom';

/** /trips/:id/travel → /trips/:id?tab=overview */
export default function TripTravelStatusRedirectPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  if (!id) {
    return <Navigate to="/dashboard/trips" replace />;
  }
  const next = new URLSearchParams(searchParams);
  next.set('tab', 'overview');
  return <Navigate to={`/dashboard/trips/${id}?${next.toString()}`} replace />;
}
