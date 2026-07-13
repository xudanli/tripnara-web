import { describe, expect, it } from 'vitest';
import {
  buildPlanningWorkbenchPath,
  buildTripTravelStatusPath,
} from './travel-status-navigation.util';

describe('travel-status-navigation.util', () => {
  it('buildTripTravelStatusPath points to trip archive page', () => {
    expect(buildTripTravelStatusPath('trip-1')).toBe('/dashboard/trips/trip-1');
  });

  it('buildPlanningWorkbenchPath defaults to arrange itinerary home', () => {
    expect(buildPlanningWorkbenchPath('trip-1')).toBe(
      '/dashboard/plan-studio?tripId=trip-1&tab=schedule&arrangeItinerary=1',
    );
  });

  it('buildPlanningWorkbenchPath supports diagnosis and explore modes', () => {
    expect(buildPlanningWorkbenchPath('trip-1', { scheduleMode: 'diagnosis' })).toBe(
      '/dashboard/plan-studio?tripId=trip-1&tab=schedule&itineraryDiagnosis=1',
    );
    expect(buildPlanningWorkbenchPath('trip-1', { scheduleMode: 'explore' })).toBe(
      '/dashboard/plan-studio?tripId=trip-1&tab=schedule&attractionExplore=1',
    );
  });
});
