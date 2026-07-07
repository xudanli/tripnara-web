import { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useExplorationTravelContext } from '../context/ExplorationTravelContext';

/**
 * 场景 5 — 其他 Tab submitIntent 成功后，本 Tab 经 SSE 收到 revision 变更时提示。
 */
export function ExploreRevisionSyncNotifier() {
  const { enabled, state, ready } = useExplorationTravelContext();
  const revisionRef = useRef<number | null>(null);
  const localWriteRef = useRef(false);

  useEffect(() => {
    if (!enabled || !ready || !state) return;

    const prev = revisionRef.current;
    const next = state.revision;

    if (prev !== null && next > prev && !localWriteRef.current && !state.loading) {
      toast.message('行程刚刚发生了新的变化', {
        description: '页面已同步最新状态，当前生效方案未被自动修改。',
        icon: <RefreshCw className="w-4 h-4" />,
      });
    }

    revisionRef.current = next;
    localWriteRef.current = false;
  }, [enabled, ready, state?.revision, state?.loading]);

  useEffect(() => {
    if (!enabled) return;
    const markLocalWrite = () => {
      localWriteRef.current = true;
    };
    window.addEventListener('exploration-travel-context-local-write', markLocalWrite);
    return () => window.removeEventListener('exploration-travel-context-local-write', markLocalWrite);
  }, [enabled]);

  return null;
}

export function notifyExplorationTravelContextLocalWrite() {
  window.dispatchEvent(new Event('exploration-travel-context-local-write'));
}
