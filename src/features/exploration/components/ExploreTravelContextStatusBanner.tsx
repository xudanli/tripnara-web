import { AlertTriangle } from 'lucide-react';
import { useExplorationTravelContext } from '../context/ExplorationTravelContext';
import { exploreUi } from '../explore-ui';
import { cn } from '@/lib/utils';

/** 联调期：Travel Context 加载/同步失败时在探索页顶部可见 */
export function ExploreTravelContextStatusBanner() {
  const { enabled, ready, state, revision } = useExplorationTravelContext();

  if (!enabled) return null;

  if (!ready && !state?.error) {
    return (
      <div className={cn(exploreUi.infoBanner, 'mb-3 text-xs text-muted-foreground')}>
        正在同步 Travel Context（contextId = scenarioId）…
      </div>
    );
  }

  if (state?.error) {
    return (
      <div
        className={cn(
          exploreUi.warnCard,
          'mb-3 flex gap-2 items-start px-3 py-2 text-xs text-foreground',
        )}
        role="alert"
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Travel Context 同步失败</p>
          <p className="text-muted-foreground mt-0.5">{state.error}</p>
          <p className="text-muted-foreground mt-1">
            联调检查：后端 <code className="text-[10px]">EXPLORATION_CONSUMER_MVP_ENABLED=1</code>、
            <code className="text-[10px]">DECISION_GATEWAY_UNIFIED=1</code>；Network 看{' '}
            <code className="text-[10px]">/api/travel-contexts/…</code>
          </p>
        </div>
      </div>
    );
  }

  if (import.meta.env.DEV && import.meta.env.VITE_TRAVEL_CONTEXT_DEBUG === '1' && revision > 0) {
    return (
      <div className="mb-2 text-[10px] text-muted-foreground font-mono">
        TC rev {revision}
      </div>
    );
  }

  return null;
}
