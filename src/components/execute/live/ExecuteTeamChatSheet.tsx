import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  Bluetooth,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Keyboard,
  MapPin,
  MessageCircle,
  Mic,
  Radio,
  Snowflake,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useTeamIntercom } from '@/hooks/useTeamIntercom';
import type { ExecuteMemberStatusItem } from './ExecuteStatusSidebar';
import { executeIntercomUi as ui, formatRallyMinutes } from './execute-intercom-ui';
import {
  formatDistance,
  INTERCOM_QUICK_STATUS_LABELS,
  type IntercomMessage,
  type IntercomPeer,
  type IntercomQuickStatus,
} from '@/lib/team-intercom.util';
import { semanticGoodText, semanticWarnText } from '@/lib/semantic-ui-classes';

export interface ExecuteTeamChatMember {
  userId: string;
  displayName: string;
}

export type ExecuteTeamChatMessage = IntercomMessage;

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 2).toUpperCase();
}

function PeerStatusDot({ peer }: { peer: IntercomPeer }) {
  if (peer.connection === 'disconnected') {
    return <Circle className="h-2 w-2 fill-muted-foreground/30 text-muted-foreground/30" />;
  }
  if (peer.connection === 'self') {
    return <Circle className="h-2 w-2 fill-foreground text-foreground" />;
  }
  if (peer.health === 'rest') {
    return <Circle className={cn('h-2 w-2 fill-current', semanticWarnText)} />;
  }
  return <Circle className={cn('h-2 w-2 fill-current', semanticGoodText)} />;
}

function peerStatusLabel(peer: IntercomPeer): string {
  if (peer.connection === 'disconnected') return '未连接';
  if (peer.connection === 'self') return '已连接';
  if (peer.health === 'rest') return '需要休息';
  return '状态良好';
}

function WaveformBars({ levels, active }: { levels: number[]; active?: boolean }) {
  return (
    <div className="flex h-7 items-end gap-[3px]" aria-hidden>
      {levels.map((level, i) => (
        <span
          key={i}
          className={cn('w-[3px] rounded-full', active ? 'bg-foreground/70' : 'bg-muted-foreground/50')}
          style={{ height: `${Math.max(20, Math.round(level * 100))}%` }}
        />
      ))}
    </div>
  );
}

function VoiceMessageBubble({
  message,
  isSelf,
}: {
  message: Extract<IntercomMessage, { kind: 'voice' }>;
  isSelf: boolean;
}) {
  return (
    <div className={isSelf ? ui.bubbleVoiceSelf : ui.bubbleVoice}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <WaveformBars levels={message.waveform} active={isSelf} />
        <span className={cn(ui.msgTime, 'shrink-0')}>
          0:{String(message.durationSec).padStart(2, '0')}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-foreground">{message.transcript}</p>
      {(message.distanceFromRallyKm != null ||
        (message.deliveredCount != null && message.peerCount != null)) && (
        <div className={ui.bubbleFoot}>
          {message.distanceFromRallyKm != null ? (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              距集合点 {message.distanceFromRallyKm}km
            </span>
          ) : null}
          {message.deliveredCount != null && message.peerCount != null ? (
            <span>已送达 {message.deliveredCount}/{message.peerCount} 人</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatusMessageBubble({ message }: { message: Extract<IntercomMessage, { kind: 'status' }> }) {
  return (
    <div className={ui.bubbleStatus}>
      <Badge variant="outline" className={cn(ui.badge, 'border-border bg-muted/20', semanticWarnText)}>
        {message.text}
      </Badge>
      {message.confirmedBy && message.confirmedBy.length > 0 ? (
        <p className={cn(ui.msgMeta, 'mt-1.5')}>已确认：{message.confirmedBy.join('、')}</p>
      ) : null}
    </div>
  );
}

function MessageRow({
  message,
  currentUserId,
}: {
  message: IntercomMessage;
  currentUserId?: string;
}) {
  if (message.kind === 'system') {
    return (
      <div className={ui.systemDivider}>
        <div className={ui.systemLine} />
        <span className={ui.systemText}>{message.text}</span>
        <div className={ui.systemLine} />
      </div>
    );
  }

  const isSelf = message.senderId === currentUserId;

  return (
    <div className={cn(ui.msgRow, isSelf && 'flex-row-reverse')}>
      <Avatar className={ui.avatarSm}>
        <AvatarFallback className={ui.avatarFallback}>{initials(message.senderName)}</AvatarFallback>
      </Avatar>
      <div className={cn(ui.msgCol, isSelf && 'items-end')}>
        <div className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-0.5', isSelf && 'justify-end')}>
          <span className={ui.msgName}>{message.senderName}</span>
          <span className={ui.msgTime}>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {message.pendingSync ? (
            <Badge variant="outline" className={ui.syncBadge}>
              <Clock className="h-2.5 w-2.5" />
              待同步
            </Badge>
          ) : null}
        </div>
        {message.kind === 'voice' ? (
          <VoiceMessageBubble message={message} isSelf={isSelf} />
        ) : message.kind === 'status' ? (
          <StatusMessageBubble message={message} />
        ) : (
          <div className={isSelf ? ui.bubbleTextSelf : ui.bubbleText}>{message.text}</div>
        )}
      </div>
    </div>
  );
}

const QUICK_ACTIONS: Array<{
  status: IntercomQuickStatus;
  icon: typeof CheckCircle2;
  iconClass: string;
}> = [
  { status: 'arrived', icon: CheckCircle2, iconClass: ui.quickIconGood },
  { status: 'wait', icon: MapPin, iconClass: ui.quickIconInfo },
  { status: 'rest', icon: Circle, iconClass: ui.quickIconWarn },
  { status: 'lost', icon: Flag, iconClass: ui.quickIconBad },
];

interface ExecuteTeamChatSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripTitle?: string;
  nextStopPlaceName?: string;
  meetingTimeLabel?: string;
  minutesUntil?: number;
  contextNote?: string;
  members: ExecuteTeamChatMember[];
  memberStatuses?: ExecuteMemberStatusItem[];
  currentUserId?: string;
  currentUserName?: string;
  onlineCount?: number;
  refLat?: number;
  refLng?: number;
}

export function ExecuteTeamChatSheet({
  tripId,
  open,
  onOpenChange,
  tripTitle,
  nextStopPlaceName,
  meetingTimeLabel,
  minutesUntil,
  contextNote,
  members,
  memberStatuses,
  currentUserId,
  currentUserName,
  onlineCount,
  refLat,
  refLng,
}: ExecuteTeamChatSheetProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const intercom = useTeamIntercom({
    tripId,
    open,
    tripTitle,
    nextStopPlaceName,
    meetingTimeLabel,
    minutesUntil,
    contextNote,
    members,
    memberStatuses,
    currentUserId,
    currentUserName,
    refLat,
    refLng,
  });

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, intercom.messages.length, intercom.isRecording]);

  const subtitle = tripTitle ? `${tripTitle} · 执行中` : '行中 · 执行中';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn(ui.sheet, 'h-full max-h-screen')}>
        <SheetHeader className={ui.header}>
          <div className={ui.headerRow}>
            <span className={ui.headerIcon}>
              <Radio className="h-3 w-3 text-muted-foreground" aria-hidden />
            </span>
            <SheetTitle className={ui.headerTitle}>团队对讲</SheetTitle>
          </div>
          <SheetDescription className={ui.headerSub}>{subtitle}</SheetDescription>
          <div className={ui.connectivityRow}>
            <span className={ui.connectivityLabel}>
              <Bluetooth className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              蓝牙直连 · {onlineCount ?? intercom.bluetoothConnectedCount} 人已连接
            </span>
            <span className={ui.connectivityMeta}>
              {intercom.syncing ? '同步中…' : '无网可通话'}
            </span>
          </div>
        </SheetHeader>

        <div className={cn(ui.sectionPad, 'flex items-start gap-2')}>
          <div className={cn(ui.missionCard, 'min-w-0 flex-1')}>
            <div className={ui.missionEyebrow}>
              <Flag className="h-3 w-3 shrink-0" />
              当前任务
            </div>
            <p className={ui.missionTitle}>{intercom.mission.title}</p>
            <p className={ui.missionBody}>{intercom.mission.meetingPoint}</p>
            {(intercom.mission.meetingTimeLabel || intercom.mission.contextNote) && (
              <p className={ui.missionMeta}>
                {intercom.mission.meetingTimeLabel ? (
                  <>
                    <Clock className="mr-0.5 inline h-3 w-3 shrink-0 align-text-bottom" />
                    <span className={ui.missionHighlight}>预计集合 {intercom.mission.meetingTimeLabel}</span>
                    {formatRallyMinutes(intercom.mission.minutesUntil) ? (
                      <span> · {formatRallyMinutes(intercom.mission.minutesUntil)}</span>
                    ) : null}
                  </>
                ) : null}
                {intercom.mission.contextNote ? (
                  <span className={ui.missionNote}>
                    {intercom.mission.meetingTimeLabel ? ' · ' : null}
                    <Snowflake className="mr-0.5 inline h-3 w-3 shrink-0 align-text-bottom" />
                    {intercom.mission.contextNote}
                  </span>
                ) : null}
              </p>
            )}
          </div>

          <div className={ui.peerStrip}>
            {intercom.peers.map((peer) => {
              const distanceLabel = formatDistance(peer.distanceMeters);
              const statusLabel = peerStatusLabel(peer);
              const metaLabel =
                distanceLabel && distanceLabel !== statusLabel
                  ? `${distanceLabel} · ${statusLabel}`
                  : statusLabel;

              return (
                <div
                  key={peer.userId}
                  className={cn(ui.peerCard, peer.connection === 'self' && ui.peerCardSelf)}
                >
                  <div className="relative">
                    <Avatar className={ui.peerAvatar}>
                      <AvatarFallback className={ui.avatarFallback}>
                        {initials(peer.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-px -right-px rounded-full bg-card p-px">
                      <PeerStatusDot peer={peer} />
                    </span>
                  </div>
                  <span className={ui.peerName}>{peer.displayName}</span>
                  <span className={ui.peerMeta}>{metaLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div ref={listRef} className={ui.feed}>
          {intercom.messages.length === 0 ? (
            <div className={ui.feedEmpty}>
              <MessageCircle className="h-8 w-8 text-muted-foreground/35" aria-hidden />
              <p className="text-xs font-medium text-foreground">暂无对讲记录</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                按住下方按钮说话，或点快捷状态通知队友
              </p>
            </div>
          ) : (
            intercom.messages.map((message) => (
              <MessageRow key={message.id} message={message} currentUserId={currentUserId} />
            ))
          )}

          <div className={ui.aiCard}>
            <div className={ui.aiTitle}>
              <Bot className="h-3 w-3 text-muted-foreground" />
              AI 状态摘要
            </div>
            <ul className={ui.aiList}>
              {intercom.aiSummaryLines.map((line) => (
                <li key={line} className={ui.aiItem}>
                  <span className={ui.aiBullet} />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={ui.dock}>
          <div className={ui.quickGrid}>
            {QUICK_ACTIONS.map(({ status, icon: Icon, iconClass }) => (
              <button
                key={status}
                type="button"
                className={ui.quickBtn}
                onClick={() => void intercom.sendQuickStatus(status)}
              >
                <Icon className={cn('h-3 w-3', iconClass)} />
                {INTERCOM_QUICK_STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {intercom.inputMode === 'text' ? (
            <div className="mb-1.5 flex items-center gap-1.5">
              <Input
                value={intercom.textDraft}
                onChange={(e) => intercom.setTextDraft(e.target.value)}
                placeholder="输入文字消息…"
                className="h-8 rounded-lg border-border bg-muted/15 text-[11px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void intercom.sendText(intercom.textDraft);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 rounded-lg px-3 text-[11px]"
                disabled={!intercom.textDraft.trim()}
                onClick={() => void intercom.sendText(intercom.textDraft)}
              >
                发送
              </Button>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <button
              type="button"
              className={cn(
                ui.dockSideBtn,
                intercom.inputMode === 'ptt' && ui.dockSideBtnActive,
              )}
              onClick={() => intercom.setInputMode('ptt')}
            >
              <User className="h-4 w-4" />
              状态
            </button>

            <div className={ui.pttWrap}>
              {!intercom.isRecording ? (
                <p className={ui.pttHint}>上滑锁定</p>
              ) : null}
              <button
                type="button"
                className={intercom.isRecording ? ui.pttBtnRecording : ui.pttBtn}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  void intercom.startRecording();
                }}
                onPointerUp={() => {
                  if (!intercom.isPttLocked) void intercom.stopRecording();
                }}
                onPointerLeave={() => {
                  if (!intercom.isPttLocked && intercom.isRecording) void intercom.stopRecording();
                }}
                onPointerMove={(e) => {
                  if (!intercom.isRecording) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (e.clientY < rect.top - 24) intercom.setIsPttLocked(true);
                }}
              >
                <Mic className={cn('h-4 w-4 shrink-0', intercom.isRecording && 'animate-pulse')} />
                <span className={ui.pttLabel}>
                  {intercom.isRecording
                    ? intercom.isPttLocked
                      ? `锁定 ${intercom.recordingSec}s`
                      : `对讲中 ${intercom.recordingSec}s`
                    : '按住对讲'}
                </span>
              </button>
              {intercom.isPttLocked && intercom.isRecording ? (
                <button
                  type="button"
                  className="mt-1.5 w-full text-center text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => {
                    intercom.setIsPttLocked(false);
                    void intercom.stopRecording();
                  }}
                >
                  点击结束
                </button>
              ) : null}
            </div>

            <button
              type="button"
              className={cn(
                ui.dockSideBtn,
                intercom.inputMode === 'text' && ui.dockSideBtnActive,
              )}
              onClick={() =>
                intercom.setInputMode(intercom.inputMode === 'text' ? 'ptt' : 'text')
              }
            >
              <Keyboard className="h-4 w-4" />
              文字
            </button>
          </div>

          <p className={ui.dockFoot}>
            通过手机蓝牙与附近队友对讲
            {!intercom.isOnline ? ' · 当前离线，消息安全保存在本机' : ''}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
