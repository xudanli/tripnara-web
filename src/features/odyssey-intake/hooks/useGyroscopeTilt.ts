import { useEffect, useRef } from 'react';

/** 名片 3D 倾斜：鼠标 + deviceorientation（需 ui.gyroscopeEnabled） */
export function useGyroscopeTilt(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const apply = (rotateY: number, rotateX: number) => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `perspective(800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    };

    const reset = () => apply(0, 0);

    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      apply(Math.max(-12, Math.min(12, gamma * 0.3)), Math.max(-8, Math.min(8, (beta - 45) * -0.15)));
    };

    window.addEventListener('deviceorientation', onOrientation);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      reset();
    };
  }, [enabled]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
  };

  return { ref, onMouseMove, onMouseLeave };
}
