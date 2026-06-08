import type { OdysseyCredentialsMe } from '@/types/odyssey-intake';
import type { VerifiedCredentials } from '@/types/match-square';
import { normalizeVerifiedCredentials } from '@/features/match-square/lib/verified-credentials';

/** Identity Hub GET /credentials/me → 广场共用 VerifiedCredentials */
export function normalizeOdysseyCredentialsMe(raw: unknown): VerifiedCredentials | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as OdysseyCredentialsMe & Record<string, unknown>;

  const nested =
    record.verifiedCredentials ??
    record.verified_credentials ??
    (record.headline || record.dossier ? record : null);

  const normalized = normalizeVerifiedCredentials(nested ?? record);
  if (normalized?.headline?.identityHeadline) return normalized;

  return normalizeVerifiedCredentials({
    education: record.education,
    profession: record.profession,
    zhimaCredit: record.zhimaCredit ?? record.zhima_credit,
    headline: record.headline,
    dossier: record.dossier,
  });
}
