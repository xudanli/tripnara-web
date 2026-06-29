import { cn } from '@/lib/utils';

/** 协作中心 Dashboard 12 列栅格 */
export const collabDashboardGrid =
  'grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12';

export function collabDashboardSpan(
  cols: { md?: number; lg: number },
): string {
  const md = cols.md ?? cols.lg;
  return cn(
    md === 12 && 'md:col-span-6',
    md === 6 && 'md:col-span-6',
    md === 4 && 'md:col-span-3',
    md === 3 && 'md:col-span-3',
    cols.lg === 12 && 'lg:col-span-12',
    cols.lg === 8 && 'lg:col-span-8',
    cols.lg === 6 && 'lg:col-span-6',
    cols.lg === 5 && 'lg:col-span-5',
    cols.lg === 4 && 'lg:col-span-4',
    cols.lg === 3 && 'lg:col-span-3',
  );
}
