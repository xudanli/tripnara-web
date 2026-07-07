/** 在浏览器空闲时执行回调，避免与首屏渲染/关键 GET 争抢主线程与带宽 */
export function deferUntilIdle(callback: () => void, timeoutMs = 2_000): () => void {
  let cancelled = false;
  const run = () => {
    if (!cancelled) callback();
  };

  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(run, { timeout: timeoutMs });
    return () => {
      cancelled = true;
      cancelIdleCallback(id);
    };
  }

  const id = window.setTimeout(run, 0);
  return () => {
    cancelled = true;
    window.clearTimeout(id);
  };
}
