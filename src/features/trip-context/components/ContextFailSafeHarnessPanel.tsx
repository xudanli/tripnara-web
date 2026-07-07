import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTripTravelContext } from '../context/TripTravelContext';
import type { ContextFailSafeKind, ContextFailSafeState } from '../context/TripTravelContext';
import {
  HARNESS_FAIL_SAFE_SCENARIOS,
  buildHarnessFailSafeState,
} from '../lib/travel-context-failsafe.util';

/** Harness — 模拟 Fail-Safe 场景（dev debug；无 TC 时用本地预览） */
export function ContextFailSafeHarnessPanel() {
  const tc = useTripTravelContext();
  const [localPreview, setLocalPreview] = useState<ContextFailSafeState | null>(null);

  if (!import.meta.env.DEV || import.meta.env.VITE_TRAVEL_CONTEXT_DEBUG !== '1') {
    return null;
  }

  const activeFailSafe = tc.failSafe ?? localPreview;

  const trigger = (kind: ContextFailSafeKind) => {
    if (tc.enabled) {
      tc.triggerHarnessFailSafe(kind);
      setLocalPreview(null);
    } else {
      setLocalPreview(buildHarnessFailSafeState(kind));
    }
  };

  const dismiss = () => {
    tc.dismissFailSafe();
    setLocalPreview(null);
  };

  return (
    <section className="rounded-lg border border-border/60 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Fail-Safe 场景</h2>
        <p className="text-xs text-muted-foreground mt-1">
          验证版本冲突、约束拦截、证据过期、决策权链等 Fail-Safe 文案。
          {tc.enabled ? ' 已连接行程上下文。' : ' 请先填写上方行程 ID。'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {HARNESS_FAIL_SAFE_SCENARIOS.map((scenario) => (
          <Button
            key={scenario.kind}
            type="button"
            size="sm"
            variant={activeFailSafe?.kind === scenario.kind ? 'default' : 'outline'}
            className="h-8 text-xs"
            onClick={() => trigger(scenario.kind)}
          >
            {scenario.title}
          </Button>
        ))}
        {activeFailSafe ? (
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={dismiss}>
            清除
          </Button>
        ) : null}
      </div>
      {activeFailSafe && !tc.failSafe && localPreview ? (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
          role="alert"
        >
          <p className="text-sm font-semibold">{localPreview.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{localPreview.message}</p>
          {localPreview.preserveEffectivePlan ? (
            <p className="text-xs text-muted-foreground mt-1">当前生效方案保持不变。</p>
          ) : null}
        </div>
      ) : tc.enabled && tc.failSafe ? (
        <p className="text-[10px] text-muted-foreground">
          横幅已注入行程壳（在「用户概览」等 /trips/:id 页面可见）。
        </p>
      ) : null}
    </section>
  );
}
