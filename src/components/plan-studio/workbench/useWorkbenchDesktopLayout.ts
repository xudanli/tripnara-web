import { useEffect, useState } from 'react';
import { WORKBENCH_DESKTOP_BREAKPOINT_PX } from './workbench-mobile.types';

export function useWorkbenchDesktopLayout(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${WORKBENCH_DESKTOP_BREAKPOINT_PX}px)`);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isDesktop;
}
