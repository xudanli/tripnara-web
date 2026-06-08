import { odysseyIntakeApi } from '@/api/odyssey-intake';
import type { VerifiedCredentials } from '@/types/match-square';
import { getMatchSquareApiMode } from '@/features/match-square/lib/match-square-api-mode';
import { MOCK_VIEWER_CREDENTIALS } from '@/features/match-square/lib/verified-credentials';
import { odysseyCredentialsMockStore } from './credentials-mock-store';

function hasVerifiedAssets(credentials: VerifiedCredentials | null | undefined): boolean {
  return Boolean(
    credentials?.education?.verified ||
      credentials?.profession?.verified ||
      credentials?.zhimaCredit?.verified
  );
}

/** 合并 live API 与本地 mock — auto 模式下本地已授信字段优先，避免 GET 覆盖 POST mock 结果 */
export function mergeCredentialsSources(
  live: VerifiedCredentials | null,
  local: VerifiedCredentials | null
): VerifiedCredentials | null {
  if (!live && !local) return null;
  if (!live) return local;
  if (!local) return live;

  const education = local.education?.verified ? local.education : live.education;
  const profession = local.profession?.verified ? local.profession : live.profession;
  const zhimaCredit = local.zhimaCredit?.verified ? local.zhimaCredit : live.zhimaCredit;

  const headline =
    local.headline?.identityHeadline && hasVerifiedAssets(local)
      ? local.headline
      : live.headline?.identityHeadline
        ? live.headline
        : local.headline;

  const dossier = local.dossier?.displayName && hasVerifiedAssets(local) ? local.dossier : live.dossier ?? local.dossier;

  return {
    headline: headline ?? live.headline ?? local.headline ?? { identityHeadline: '', trustAssetLine: '' },
    dossier,
    education,
    profession,
    zhimaCredit,
  };
}

/** Identity Hub / 广场共用加载器 */
export async function loadMyCredentials(): Promise<VerifiedCredentials | null> {
  const mode = getMatchSquareApiMode();
  const local = await odysseyCredentialsMockStore.get();

  if (mode === 'mock') return local;

  try {
    const live = await odysseyIntakeApi.getMyCredentials();
    if (mode === 'auto') {
      const merged = mergeCredentialsSources(live, local);
      if (merged) return merged;
      return live ?? local ?? MOCK_VIEWER_CREDENTIALS;
    }
    return live;
  } catch {
    if (mode === 'auto') {
      return local ?? MOCK_VIEWER_CREDENTIALS;
    }
    throw new Error('CREDENTIALS_UNAVAILABLE');
  }
}
