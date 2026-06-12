import { useCallback } from 'react';
import {
  shouldShowProactiveNotification,
  type NotificationPriority,
} from '@/lib/proactivity-gate';
import { useEmotionContextStore } from '@/store/emotionContextStore';
import type { ProactivityGate } from '@/types/emotional-context';

export function useProactivityGate(): {
  proactivityGate: ProactivityGate;
  shouldNotify: (priority: NotificationPriority) => boolean;
} {
  const proactivityGate = useEmotionContextStore((s) => s.proactivityGate);

  const shouldNotify = useCallback(
    (priority: NotificationPriority) => shouldShowProactiveNotification(proactivityGate, priority),
    [proactivityGate]
  );

  return { proactivityGate, shouldNotify };
}
