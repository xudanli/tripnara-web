import * as Sentry from '@sentry/react';

let sentryReady = false;

function isSentryEnabled(): boolean {
  if (import.meta.env.VITE_SENTRY_ENABLED === '0') return false;
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  return Boolean(dsn);
}

/** 配置了 VITE_SENTRY_DSN 时初始化；无 DSN 时 no-op */
export function initSentry(): void {
  if (sentryReady || !isSentryEnabled()) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN!.trim();
  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() ||
      import.meta.env.MODE ||
      'production',
    integrations: [],
    tracesSampleRate: import.meta.env.PROD ? 0.05 : 0,
    beforeSend(event) {
      if (import.meta.env.DEV && import.meta.env.VITE_SENTRY_ENABLED !== '1') {
        return null;
      }
      return event;
    },
  });

  sentryReady = true;
}

export function isSentryInitialized(): boolean {
  return sentryReady;
}

export function captureSentryMessage(
  message: string,
  options?: {
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
    extra?: Record<string, unknown>;
  },
): void {
  if (!sentryReady) return;
  Sentry.captureMessage(message, {
    level: options?.level ?? 'warning',
    extra: options?.extra,
  });
}

export { Sentry };
