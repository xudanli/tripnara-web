import { Outlet } from 'react-router-dom';
import { ContextStatusBar } from './ContextStatusBar';
import { ContextAttentionStrip } from './ContextAttentionStrip';
import { ContextFailSafeBanner } from './ContextFailSafeBanner';
import { ContextDiffDrawer } from './ContextDiffDrawer';

/** P0.1 — 统一行程壳：状态栏 + 提醒条 + 页面投影 */
export function TripContextShell({ hideLegacyStatusBar = false }: { hideLegacyStatusBar?: boolean }) {
  return (
    <div className="min-h-0 flex flex-col">
      {!hideLegacyStatusBar ? <ContextStatusBar /> : null}
      <ContextFailSafeBanner />
      <ContextAttentionStrip />
      <ContextDiffDrawer />
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
