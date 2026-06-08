import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComputeStep } from '@/types/hiking';
import { revealAfterStepId, stepDurationMs } from '@/lib/hiking-compute-steps';

export type ComputeRevealState = {
  elevation: boolean;
  fitness: boolean;
  weather: boolean;
};

const INITIAL_REVEAL: ComputeRevealState = {
  elevation: false,
  fitness: false,
  weather: false,
};

export function useComputeStepsPlayback(steps: ComputeStep[] | undefined) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [stepProgress, setStepProgress] = useState(0);
  const [reveal, setReveal] = useState<ComputeRevealState>(INITIAL_REVEAL);
  const [finished, setFinished] = useState(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const run = useCallback(() => {
    if (!steps?.length) return;
    clearTimers();
    setActiveIndex(-1);
    setStepProgress(0);
    setReveal(INITIAL_REVEAL);
    setFinished(false);

    let offset = 0;
    steps.forEach((step, index) => {
      const duration = stepDurationMs(step);
      const startAt = offset;
      offset += duration;

      timersRef.current.push(
        window.setTimeout(() => {
          setActiveIndex(index);
          setStepProgress(0);
        }, startAt)
      );

      const tickMs = 50;
      const ticks = Math.ceil(duration / tickMs);
      for (let t = 1; t <= ticks; t++) {
        timersRef.current.push(
          window.setTimeout(() => {
            setStepProgress(Math.min(1, t / ticks));
          }, startAt + t * tickMs)
        );
      }

      timersRef.current.push(
        window.setTimeout(() => {
          const key = revealAfterStepId(step.id);
          if (key) {
            setReveal((r) => ({ ...r, [key]: true }));
          }
          setStepProgress(1);
        }, startAt + duration)
      );
    });

    timersRef.current.push(
      window.setTimeout(() => {
        setActiveIndex(-1);
        setFinished(true);
      }, offset)
    );
  }, [steps, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    activeIndex,
    stepProgress,
    reveal,
    finished,
    run,
    reset: () => {
      clearTimers();
      setActiveIndex(-1);
      setStepProgress(0);
      setReveal(INITIAL_REVEAL);
      setFinished(false);
    },
  };
}
