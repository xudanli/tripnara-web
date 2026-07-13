import { isApiNotReadyError } from '@/lib/api-fallback-mode';

export type SelfEvolutionApiMode = 'mock' | 'live' | 'auto';

export function getSelfEvolutionApiMode(): SelfEvolutionApiMode {
  const flag = import.meta.env.VITE_SELF_EVOLUTION_MOCK;
  if (flag === '1') return 'mock';
  if (flag === '0') return 'live';
  return 'live';
}

export async function withSelfEvolutionFallback<T>(
  live: () => Promise<T>,
  mock: () => Promise<T>
): Promise<T> {
  const mode = getSelfEvolutionApiMode();
  if (mode === 'mock') return mock();
  try {
    return await live();
  } catch (error) {
    if (mode === 'auto' && isApiNotReadyError(error)) {
      console.info('[Self Evolution] 后端接口未就绪，使用 mock 数据');
      return mock();
    }
    throw error;
  }
}
