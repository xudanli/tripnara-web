/** Trip Loop Engineering — align with backend IN_TRIP_LOOP_* flags */
export function isTripLoopInTripEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_TRIP_LOOP_IN_TRIP !== '0';
}
