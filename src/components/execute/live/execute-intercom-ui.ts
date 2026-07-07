import { executeSidebarUi } from './execute-sidebar-ui';
import {
  productInfoInsetClass,
  productInfoPanelClass,
  semanticBadText,
  semanticGoodText,
  semanticInfoText,
  semanticWarnText,
} from '@/lib/semantic-ui-classes';

/** 团队对讲 Sheet · 紧凑布局，优先留给对话区 */
export const executeIntercomUi = {
  sheet: 'flex h-full w-full flex-col gap-0 p-0 sm:max-w-md bg-background',
  header: 'shrink-0 border-b border-border bg-card px-3 py-2 text-left space-y-1',
  headerRow: 'flex items-center gap-1.5',
  headerIcon: 'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/25',
  headerTitle: 'text-[13px] font-semibold tracking-tight text-foreground leading-none',
  headerSub: 'text-[10px] text-muted-foreground leading-none',
  connectivityRow: 'flex items-center justify-between gap-2 text-[10px]',
  connectivityLabel: 'font-medium text-foreground inline-flex items-center gap-1 min-w-0 truncate',
  connectivityMeta: 'text-muted-foreground shrink-0',
  sectionPad: 'shrink-0 border-b border-border px-3 py-1.5',
  missionCard: 'rounded-lg border border-border bg-card px-2.5 py-2 shadow-sm',
  missionEyebrow: 'mb-0.5 flex items-center gap-1 text-[9px] font-medium text-muted-foreground',
  missionTitle: 'text-xs font-semibold text-foreground leading-tight line-clamp-1',
  missionBody: 'text-[10px] text-muted-foreground leading-snug line-clamp-1',
  missionMeta: 'mt-0.5 text-[10px] text-muted-foreground leading-snug line-clamp-2',
  missionHighlight: 'font-medium text-foreground tabular-nums',
  missionNote: 'text-muted-foreground',
  peerStrip: 'flex gap-1 overflow-x-auto',
  peerCard:
    'flex w-[52px] shrink-0 flex-col items-center gap-0 rounded-md border border-border bg-card px-0.5 py-0.5',
  peerCardSelf: 'border-foreground/25 bg-muted/15',
  peerAvatar: 'h-5 w-5 shrink-0 border border-border',
  peerName: 'w-full truncate text-center text-[8px] font-medium text-foreground leading-none mt-px',
  peerMeta: 'text-[7px] text-muted-foreground text-center leading-none',
  feed: 'min-h-0 flex-1 overflow-y-auto bg-muted/10 px-2.5 py-2 space-y-1.5',
  feedEmpty: 'flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 bg-card/40 px-3 py-4 text-center',
  systemDivider: 'flex items-center gap-1.5 py-0.5',
  systemLine: 'h-px flex-1 bg-border',
  systemText: 'text-[9px] text-muted-foreground whitespace-nowrap',
  msgRow: 'flex gap-2',
  msgCol: 'min-w-0 max-w-[88%] space-y-0.5',
  msgMeta: 'text-[9px] text-muted-foreground',
  msgName: 'text-[9px] font-medium text-foreground',
  msgTime: 'text-[9px] tabular-nums text-muted-foreground',
  bubbleVoice: 'rounded-xl border border-border bg-card px-2.5 py-2 shadow-sm',
  bubbleVoiceSelf: 'rounded-xl border border-border bg-muted/25 px-2.5 py-2',
  bubbleText: 'rounded-xl rounded-tr-sm px-2.5 py-1.5 text-[11px] leading-snug bg-muted/50 text-foreground',
  bubbleTextSelf: 'rounded-xl rounded-tl-sm px-2.5 py-1.5 text-[11px] leading-snug bg-foreground text-background',
  bubbleStatus: `rounded-xl border border-border bg-card px-2.5 py-2 ${productInfoInsetClass}`,
  bubbleFoot: 'mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground',
  aiCard: `${productInfoPanelClass} rounded-lg p-2`,
  aiTitle: 'mb-1 flex items-center gap-1 text-[10px] font-semibold text-foreground',
  aiList: 'space-y-1',
  aiItem: 'flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground',
  aiBullet: 'mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/50',
  dock: 'shrink-0 border-t border-border bg-card px-2.5 pt-1.5 pb-2 shadow-[0_-2px_16px_-6px_rgba(0,0,0,0.06)]',
  quickGrid: 'mb-1.5 grid grid-cols-4 gap-1',
  quickBtn:
    'flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-card px-0.5 py-1 text-[9px] font-medium text-foreground transition-colors hover:bg-muted/25 active:scale-[0.98]',
  quickIconGood: semanticGoodText,
  quickIconInfo: semanticInfoText,
  quickIconWarn: semanticWarnText,
  quickIconBad: semanticBadText,
  dockSideBtn: 'flex w-10 flex-col items-center gap-px py-0.5 text-[9px] text-muted-foreground transition-colors hover:text-foreground',
  dockSideBtnActive: 'text-foreground font-medium',
  pttWrap: 'relative min-w-0 flex-1',
  pttHint: 'pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground',
  pttBtn:
    'flex w-full flex-row items-center justify-center gap-1.5 rounded-full border border-border bg-foreground py-2.5 text-background shadow-sm transition-all active:scale-[0.99]',
  pttBtnRecording:
    'flex w-full flex-row items-center justify-center gap-1.5 rounded-full border border-primary bg-primary py-2.5 text-primary-foreground shadow-sm ring-2 ring-primary/20',
  pttLabel: 'text-[11px] font-semibold leading-none',
  dockFoot: 'mt-1 text-center text-[9px] leading-snug text-muted-foreground',
  avatarSm: 'h-6 w-6 shrink-0 border border-border',
  avatarFallback: 'text-[8px] bg-muted text-muted-foreground font-medium',
  badge: executeSidebarUi.badge,
  syncBadge: 'h-3.5 gap-0.5 border-border bg-muted/30 px-1 text-[8px] font-normal text-muted-foreground',
} as const;

export function formatRallyMinutes(minutes?: number): string | null {
  if (minutes == null) return null;
  if (minutes > 24 * 60) return null;
  if (minutes <= 0) return '即将集合';
  return `还有 ${minutes} 分钟`;
}
