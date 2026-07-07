import { Navigate, useParams } from 'react-router-dom';
import { TripTravelContextProvider } from '@/features/trip-context';
import { TravelContextInspectorPage } from '@/features/trip-context/pages/TravelContextInspectorPage';

function isTravelContextInspectorEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_TRAVEL_CONTEXT_DEBUG === '1';
}

/** /dashboard/internal/trips/:id/context — dev-only Travel Context Inspector */
export default function InternalTripContextInspectorRoute() {
  const { id: tripId = '' } = useParams<{ id: string }>();

  if (!isTravelContextInspectorEnabled()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!tripId) {
    return <Navigate to="/dashboard/internal/harness" replace />;
  }

  return (
    <TripTravelContextProvider tripId={tripId}>
      <TravelContextInspectorPage tripId={tripId} />
    </TripTravelContextProvider>
  );
}
