import { describe, expect, it } from 'vitest';
import { enrichRouteAndRunRequestWithTravelCompiler } from '@/lib/enrich-route-and-run-travel-compiler';
import {
  isTravelCompilerEnabledByEnv,
  shouldEnableTravelCompilerOnRouteRun,
} from '@/features/agent/ctre/constants';

describe('enrichRouteAndRunRequestWithTravelCompiler', () => {
  it('respects explicit enable_travel_compiler: false', () => {
    const req = enrichRouteAndRunRequestWithTravelCompiler({
      message: 'test',
      user_id: 'u1',
      options: { enable_travel_compiler: false },
    });
    expect(req.options?.enable_travel_compiler).toBe(false);
  });

  it('preserves explicit enable_travel_compiler: true', () => {
    const req = enrichRouteAndRunRequestWithTravelCompiler({
      message: 'test',
      user_id: 'u1',
      options: { enable_travel_compiler: true },
    });
    expect(req.options?.enable_travel_compiler).toBe(true);
  });
});

describe('shouldEnableTravelCompilerOnRouteRun', () => {
  it('honors explicit overrides', () => {
    expect(shouldEnableTravelCompilerOnRouteRun(true)).toBe(true);
    expect(shouldEnableTravelCompilerOnRouteRun(false)).toBe(false);
  });

  it('reads env helper without throwing', () => {
    expect(typeof isTravelCompilerEnabledByEnv()).toBe('boolean');
  });
});
