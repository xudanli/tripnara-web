import { TripTravelContextProvider } from './TripTravelContext';
import { TripContextShell } from '../components/TripContextShell';
import { TripWorldStateBar } from '@/components/trip-world-state/TripWorldStateBar';

/** 包裹 /trips/:id/* — resolveFromTrip + 统一 Context Shell */
export default function TripContextShellLayout() {
  return (
    <TripTravelContextProvider>
      <TripWorldStateBar />
      <TripContextShell hideLegacyStatusBar />
    </TripTravelContextProvider>
  );
}
