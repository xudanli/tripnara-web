import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('sentry-init', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('no-ops when VITE_SENTRY_DSN is unset', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const initSentry = (await import('@/lib/sentry-init')).initSentry;
    const isSentryInitialized = (await import('@/lib/sentry-init')).isSentryInitialized;

    initSentry();
    expect(isSentryInitialized()).toBe(false);
  });
});
