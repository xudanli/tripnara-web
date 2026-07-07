import { describe, expect, it } from 'vitest';
import { toApiRouteId, toMockRouteId } from './route-id.util';

describe('route-id.util', () => {
  it('maps consumer mock ids to backend route ids', () => {
    expect(toApiRouteId('highland-south')).toBe('route_remote-highlands-south');
    expect(toApiRouteId('south-depth')).toBe('route_south-depth');
    expect(toApiRouteId('ring-compressed')).toBe('route_ring-compressed');
  });

  it('passes through existing backend route ids', () => {
    expect(toApiRouteId('route_remote-highlands-south')).toBe('route_remote-highlands-south');
    expect(toApiRouteId('route_south-depth')).toBe('route_south-depth');
  });

  it('maps strategy ids to backend route ids', () => {
    expect(toApiRouteId('remote-highlands-south')).toBe('route_remote-highlands-south');
  });

  it('resolves mock lookup keys from backend ids', () => {
    expect(toMockRouteId('route_remote-highlands-south')).toBe('highland-south');
    expect(toMockRouteId('highland-south')).toBe('highland-south');
    expect(toMockRouteId('remote-highlands-south')).toBe('highland-south');
  });
});
