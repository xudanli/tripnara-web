/** 检测是否运行在 Capacitor 原生 WebView 套壳内 */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export type AppRuntime = 'web' | 'capacitor';

export function getAppRuntime(): AppRuntime {
  return isCapacitorNative() ? 'capacitor' : 'web';
}

export function runtimeLabel(runtime: AppRuntime): string {
  return runtime === 'capacitor' ? '原生套壳' : '浏览器';
}
