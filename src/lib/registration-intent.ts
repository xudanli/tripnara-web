/** PRD §6.1 · 注册意图分流 */
export type RegistrationIntent = 'explore' | 'organize' | 'professional' | 'agency';

const STORAGE_KEY = 'tripnara_registration_intent';

export const REGISTRATION_INTENT_OPTIONS: Array<{
  id: RegistrationIntent;
  title: string;
  description: string;
}> = [
  {
    id: 'explore',
    title: '探索或加入一趟旅行',
    description: '浏览项目、表达偏好、申请加入认证旅行',
  },
  {
    id: 'organize',
    title: '组织家人和朋友旅行',
    description: '创建私人项目并邀请已知成员',
  },
  {
    id: 'professional',
    title: '我是专业领队或旅行顾问',
    description: '提交专业认证，服务客户与管理专业项目',
  },
  {
    id: 'agency',
    title: '我代表旅行机构',
    description: '创建机构空间并完成企业认证',
  },
];

export function saveRegistrationIntent(intent: RegistrationIntent): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, intent);
  } catch {
    /* ignore */
  }
}

export function readRegistrationIntent(): RegistrationIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (
      raw === 'explore' ||
      raw === 'organize' ||
      raw === 'professional' ||
      raw === 'agency'
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearRegistrationIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function postRegistrationPath(intent: RegistrationIntent | null): string {
  switch (intent) {
    case 'organize':
      return '/dashboard/trips/new';
    case 'professional':
      return '/dashboard/account/professional/apply';
    case 'agency':
      return '/dashboard/account/agency/apply';
    case 'explore':
    default:
      return '/dashboard';
  }
}
