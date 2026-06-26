/** Trip Loop Engineering — align with backend LOOP_* / IN_TRIP_LOOP_* flags */
export function isTripLoopReadinessEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_TRIP_LOOP_READINESS !== '0';
}

export function isTripLoopInTripEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_TRIP_LOOP_IN_TRIP !== '0';
}
