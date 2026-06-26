const SNOOZE_KEY = 'tripnara_decision_dna_consent_nudge_snoozed_until';
const SNOOZE_DAYS = 14;

export function isDecisionDnaConsentNudgeSnoozed(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(SNOOZE_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

export function snoozeDecisionDnaConsentNudge(days = SNOOZE_DAYS): void {
  if (typeof window === 'undefined') return;
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, String(until));
}

export const DECISION_DNA_CONSENT_SETTINGS_PATH = '/dashboard/settings?tab=data';

export const DECISION_DNA_CONSENT_QUERY_KEY = ['decision-dna', 'consent'] as const;

/** 非 React 场景也可调用（回滚/改选成功后） */
export async function triggerDecisionDnaConsentNudge(
  fetchConsent: () => Promise<{ implicit_learning: boolean }>,
): Promise<void> {
  if (typeof window === 'undefined' || isDecisionDnaConsentNudgeSnoozed()) return;

  let consent: { implicit_learning: boolean };
  try {
    consent = await fetchConsent();
  } catch {
    return;
  }

  if (consent.implicit_learning) return;

  const { toast } = await import('sonner');
  toast.info('是否允许从方案变更中学习偏好？', {
    description:
      '你刚回滚或改选了方案。开启「Decision DNA 隐式学习」后，系统可从类似行为聚合偏好；默认关闭，不会自动学习。',
    duration: 10_000,
    action: {
      label: '去设置开启',
      onClick: () => {
        window.location.href = DECISION_DNA_CONSENT_SETTINGS_PATH;
      },
    },
    onDismiss: () => snoozeDecisionDnaConsentNudge(),
  });
}
