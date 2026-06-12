import { toast, type ExternalToast } from 'sonner';
import {
  shouldShowProactiveNotification,
  type NotificationPriority,
} from '@/lib/proactivity-gate';
import { getEmotionContextStoreState } from '@/store/emotionContextStore';

type ProactiveToastOptions = ExternalToast & {
  priority?: NotificationPriority;
};

function gatedNotify(
  fn: (message: string, opts?: ExternalToast) => string | number,
  message: string,
  opts?: ProactiveToastOptions
): string | number | undefined {
  const priority = opts?.priority ?? 'medium';
  const gate = getEmotionContextStoreState().proactivityGate;
  if (!shouldShowProactiveNotification(gate, priority)) return undefined;
  const { priority: _p, ...toastOpts } = opts ?? {};
  return fn(message, toastOpts);
}

/** 行中 / 规划侧 proactive toast — 遵守 proactivityGate */
export const proactiveToast = {
  info: (message: string, opts?: ProactiveToastOptions) =>
    gatedNotify(toast.info, message, opts),
  success: (message: string, opts?: ProactiveToastOptions) =>
    gatedNotify(toast.success, message, opts),
  warning: (message: string, opts?: ProactiveToastOptions) =>
    gatedNotify(toast.warning, message, opts),
  error: (message: string, opts?: ProactiveToastOptions) =>
    gatedNotify(toast.error, message, opts),
  message: (message: string, opts?: ProactiveToastOptions) =>
    gatedNotify(toast.message, message, opts),
};

export function notifyReminderIfAllowed(
  title: string,
  priority: NotificationPriority,
  description?: string
): void {
  proactiveToast.info(title, {
    priority,
    ...(description ? { description } : {}),
  });
}

export function notifyUserNotificationIfAllowed(
  message: string,
  severity: 'info' | 'warning' | 'error',
  actionRequired?: boolean
): void {
  const priority: NotificationPriority =
    severity === 'error' ? 'urgent' : actionRequired ? 'high' : 'medium';
  const fn =
    severity === 'error'
      ? proactiveToast.error
      : severity === 'warning'
        ? proactiveToast.warning
        : proactiveToast.info;
  fn(message, { priority });
}
