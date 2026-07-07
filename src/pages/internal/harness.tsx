import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { explorationFlags } from '@/features/exploration/flags';
import {
  TripTravelContextProvider,
  ContextFailSafeHarnessPanel,
} from '@/features/trip-context';

function isTravelContextInspectorEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_TRAVEL_CONTEXT_DEBUG === '1';
}

/** /dashboard/internal/harness — 行程上下文联调台 */
export default function InternalHarnessPage() {
  const [tripId, setTripId] = useState('');

  if (!isTravelContextInspectorEnabled()) {
    return (
      <div className="mx-auto max-w-2xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">内部联调台</h1>
        <p className="text-sm text-muted-foreground">
          开发模式下设置 <code className="text-xs">VITE_TRAVEL_CONTEXT_DEBUG=1</code> 后可用。
        </p>
      </div>
    );
  }

  const harnessBody = (
    <>
      <section className="rounded-lg border border-border/60 p-4 space-y-3">
        <h2 className="text-sm font-semibold">实时行程上下文</h2>
        <p className="text-xs text-muted-foreground">
          输入行程 ID 后，Fail-Safe 按钮会连接真实 Provider（需已登录）。
        </p>
        <div className="flex gap-2">
          <Input
            value={tripId}
            onChange={(e) => setTripId(e.target.value.trim())}
            placeholder="行程 UUID，例如 3e4a1058-…"
            className="h-9 text-xs font-mono"
          />
          {tripId ? (
            <Button variant="outline" size="sm" className="h-9 shrink-0" asChild>
              <Link to={`/dashboard/internal/trips/${tripId}/context`}>打开检查器</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <ContextFailSafeHarnessPanel />
    </>
  );

  return (
    <div className="mx-auto max-w-3xl p-6 pb-12 space-y-6">
      <header>
        <h1 className="text-xl font-semibold">行程上下文联调台</h1>
        <p className="text-sm text-muted-foreground mt-1">
          RFC-003 接口联调与 Fail-Safe 场景验证（仅开发环境）
        </p>
      </header>

      <section className="rounded-lg border border-border/60 p-4 space-y-3">
        <h2 className="text-sm font-semibold">功能开关</h2>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>Travel Context 已启用：{explorationFlags.travelContextEnabled ? '是' : '否'}</li>
          <li>Revision 事件（SSE）：{explorationFlags.travelContextRevisionEvents ? '是' : '否'}</li>
          <li>调试模式：{import.meta.env.VITE_TRAVEL_CONTEXT_DEBUG === '1' ? '已开启' : '未开启'}</li>
        </ul>
      </section>

      <section className="rounded-lg border border-border/60 p-4 space-y-3">
        <h2 className="text-sm font-semibold">终端自动化测试</h2>
        <pre className="rounded-md bg-muted/40 p-3 text-xs overflow-x-auto">
{`PROXY=1 AUTH_TOKEN=<登录令牌> npm run test:travel-context

# 指定行程（场景 2）
PROXY=1 AUTH_TOKEN=<登录令牌> TRIP_ID=<行程UUID> npm run test:travel-context`}
        </pre>
        <p className="text-xs text-muted-foreground">
          登录令牌：浏览器 DevTools → Application → sessionStorage → <code>accessToken</code>
        </p>
      </section>

      {tripId ? (
        <TripTravelContextProvider tripId={tripId}>{harnessBody}</TripTravelContextProvider>
      ) : (
        harnessBody
      )}

      <section className="rounded-lg border border-border/60 p-4 space-y-2">
        <h2 className="text-sm font-semibold">快捷链接</h2>
        <ul className="text-sm space-y-1">
          <li>
            <Link className="text-primary hover:underline" to="/dashboard">
              返回工作台
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
