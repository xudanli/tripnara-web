/**
 * Consumer Exploration UI tokens — 对齐 TripNARA 视觉规范（primary 黑 + gate/nara）
 */

import { cn } from '@/lib/utils';
import {
  semanticBadSurface,
  semanticBadText,
  semanticGoodSurface,
  semanticGoodText,
  semanticInfoSurface,
  semanticInfoText,
  semanticWarnSurface,
  semanticWarnText,
} from '@/lib/semantic-ui-classes';

export const exploreUi = {
  stepActive: 'text-foreground font-medium',
  stepDone: 'text-muted-foreground',
  stepPending: 'text-muted-foreground/60',
  stepDotActive: 'bg-primary text-primary-foreground border-primary',
  stepDotDone: 'bg-muted text-success border-gate-allow-border',
  stepDotPending: 'border-border text-muted-foreground bg-background',
  stepUnderline: 'border-b-2 border-foreground pb-0.5',
  cardSelected: 'border-foreground/25 bg-muted/20 ring-1 ring-border shadow-sm',
  cardHover: 'border-border bg-card hover:border-foreground/15',
  highlightRow: 'bg-muted/30',
  tipBox: cn('rounded-2xl border p-4', semanticInfoSurface),
  infoBanner: 'rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground',
  badgeRecommended: 'bg-foreground text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-medium',
  badgeNiche: cn(
    'text-[10px] px-2 py-0.5 rounded-full font-medium border',
    semanticWarnSurface,
  ),
  badgeSelected: cn(
    'text-[10px] px-2 py-0.5 rounded-full font-medium border',
    semanticGoodSurface,
  ),
  linkInline: 'text-foreground underline-offset-4 hover:underline text-xs',
  compareBestCol: 'bg-muted/25',
  progressRunning: 'border-border bg-muted/30',
  progressDone: cn('border', semanticGoodSurface),
  progressPending: 'border-border bg-card',
  statusRunning: cn('border', semanticInfoSurface),
  statusDone: cn('border', semanticGoodSurface),
  statusPending: 'border-border bg-muted text-muted-foreground',
  rejectBanner: cn('rounded-xl px-4 py-3 mb-6 flex items-center gap-2 border', semanticBadSurface),
  rejectHeading: semanticBadText,
  warnCard: cn('rounded-xl border p-3', semanticWarnSurface),
  mapPlaceholder: 'rounded-2xl border border-border bg-muted/30',
  routeImage: 'from-muted/70 via-background to-muted/50',
  primaryBtnMin: 'min-w-[180px]',
} as const;

export {
  semanticBadSurface,
  semanticBadText,
  semanticGoodText,
  semanticInfoText,
  semanticWarnSurface,
  semanticWarnText,
};
