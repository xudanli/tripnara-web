import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tripCommsApi } from '@/api/trip-comms';
import type { ExecuteMemberStatusItem } from '@/components/execute/live/ExecuteStatusSidebar';
import {
  apiMessageToUiMessage,
  apiPeerToUiPeer,
  mergeUiMessages,
  uiMessageToSyncPayload,
} from '@/lib/trip-in-trip-comms.adapter';
import {
  allocateClientSeq,
  enqueueOutboxMessage,
  getCommsTripMeta,
  listOutboxMessages,
  loadIntercomMessagesAsync,
  removeOutboxMessage,
  saveIntercomMessagesAsync,
  updateCommsTripMeta,
} from '@/lib/team-intercom-store';
import { getIntercomNativeBridge } from '@/platform/intercom-native-bridge';
import {
  intercomMessageToPacket,
  packetToIntercomMessage,
} from '@/platform/intercom-native-bridge.types';
import { getAppRuntime } from '@/platform/native-runtime';
import {
  buildFakeWaveform,
  buildIntercomAiSummary,
  buildIntercomMission,
  buildIntercomPeers,
  INTERCOM_QUICK_STATUS_LABELS,
  type IntercomMessage,
  type IntercomMission,
  type IntercomPeer,
  type IntercomQuickStatus,
} from '@/lib/team-intercom.util';

export interface UseTeamIntercomInput {
  tripId: string;
  open: boolean;
  tripTitle?: string;
  nextStopPlaceName?: string;
  meetingTimeLabel?: string;
  minutesUntil?: number;
  contextNote?: string;
  members: Array<{ userId: string; displayName: string }>;
  memberStatuses?: ExecuteMemberStatusItem[];
  currentUserId?: string;
  currentUserName?: string;
  /** 距离参照点（如 nextStop 坐标） */
  refLat?: number;
  refLng?: number;
}

function newClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedDemoIfEmpty(
  tripId: string,
  peers: IntercomPeer[],
  existing: IntercomMessage[],
): IntercomMessage[] {
  if (existing.length > 0) return existing;

  const abu = peers.find((p) => p.displayName !== '你') ?? peers[0];
  const mom = peers.find((p) => p.health === 'rest') ?? peers[1] ?? peers[0];
  const now = Date.now();

  return [
    {
      id: 'demo-voice-1',
      kind: 'voice',
      senderId: abu?.userId ?? 'peer-1',
      senderName: abu?.displayName ?? '队友',
      createdAt: new Date(now - 8 * 60_000).toISOString(),
      durationSec: 8,
      transcript: '我已经到分叉口了，先在这里等你们',
      waveform: buildFakeWaveform(42),
      distanceFromRallyKm: 1.2,
      deliveredCount: 3,
      peerCount: 4,
    },
    {
      id: 'demo-status-1',
      kind: 'status',
      senderId: mom?.userId ?? 'peer-2',
      senderName: mom?.displayName ?? '队友',
      createdAt: new Date(now - 5 * 60_000).toISOString(),
      status: 'rest',
      text: '需要休息',
      confirmedBy: peers
        .filter((p) => p.displayName !== mom?.displayName && p.connection !== 'disconnected')
        .map((p) => p.displayName),
    },
    {
      id: 'demo-system-1',
      kind: 'system',
      senderId: 'system',
      senderName: '系统',
      createdAt: new Date(now - 3 * 60_000).toISOString(),
      text: '离线期间消息',
    },
  ];
}

export function useTeamIntercom(input: UseTeamIntercomInput) {
  const {
    tripId,
    open,
    tripTitle,
    nextStopPlaceName,
    meetingTimeLabel,
    minutesUntil,
    contextNote,
    members,
    memberStatuses,
    currentUserId = 'local-user',
    currentUserName = '我',
    refLat,
    refLng,
  } = input;

  const [messages, setMessages] = useState<IntercomMessage[]>([]);
  const [nativePeers, setNativePeers] = useState<IntercomPeer[]>([]);
  const [apiPeers, setApiPeers] = useState<IntercomPeer[]>([]);
  const [apiSummaryLines, setApiSummaryLines] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPttLocked, setIsPttLocked] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [inputMode, setInputMode] = useState<'ptt' | 'text'>('ptt');
  const [textDraft, setTextDraft] = useState('');
  const [runtime] = useState(getAppRuntime());
  const [syncing, setSyncing] = useState(false);
  const recordTimerRef = useRef<number | null>(null);
  const bridgeRef = useRef<Awaited<ReturnType<typeof getIntercomNativeBridge>> | null>(null);

  const rosterPeers = useMemo(
    () =>
      buildIntercomPeers({
        members,
        memberStatuses,
        currentUserId,
      }),
    [members, memberStatuses, currentUserId],
  );

  const peers = useMemo(() => {
    if (isOnline && apiPeers.length > 0) return apiPeers;
    if (nativePeers.length > 0) return nativePeers;
    return rosterPeers;
  }, [apiPeers, isOnline, nativePeers, rosterPeers]);

  const mission: IntercomMission = useMemo(
    () =>
      buildIntercomMission({
        tripTitle,
        nextStopPlaceName,
        meetingTimeLabel,
        minutesUntil,
        contextNote,
      }),
    [tripTitle, nextStopPlaceName, meetingTimeLabel, minutesUntil, contextNote],
  );

  const bluetoothConnectedCount = useMemo(
    () => peers.filter((p) => p.connection === 'connected' || p.connection === 'self').length,
    [peers],
  );

  const aiSummaryLines = useMemo(() => {
    if (apiSummaryLines.length > 0) return apiSummaryLines;
    return buildIntercomAiSummary(peers, messages);
  }, [apiSummaryLines, peers, messages]);

  const persist = useCallback(
    async (updater: IntercomMessage[] | ((prev: IntercomMessage[]) => IntercomMessage[])) => {
      setMessages((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        void saveIntercomMessagesAsync(tripId, next);
        return next;
      });
    },
    [tripId],
  );

  const refreshNativePeers = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    const bluetoothPeers = await bridge.getBluetoothPeers();
    if (bluetoothPeers.length === 0) return;

    setNativePeers(
      bluetoothPeers.map((bp, index) => {
        const roster = rosterPeers[index] ?? rosterPeers.find((r) => r.userId === bp.userId);
        const isSelf = bp.deviceId === 'self';
        return {
          userId: roster?.userId ?? bp.userId ?? bp.deviceId,
          displayName: isSelf ? '你' : roster?.displayName ?? bp.displayName,
          connection: isSelf ? 'self' : bp.connected ? 'connected' : 'disconnected',
          health: roster?.health ?? 'unknown',
          distanceMeters: bp.distanceMeters,
        } satisfies IntercomPeer;
      }),
    );
  }, [rosterPeers]);

  const refreshApiPeers = useCallback(async () => {
    const bridge = bridgeRef.current;
    const online = bridge ? await bridge.getNetworkConnected() : navigator.onLine;
    if (!online) return;

    const result = await tripCommsApi.getPeers(tripId, {
      refLat,
      refLng,
      staleAfterSec: 120,
    });
    if (!result?.peers?.length) return;

    setApiPeers(result.peers.map((p) => apiPeerToUiPeer(p, currentUserId)));
  }, [currentUserId, refLat, refLng, tripId]);

  const sendHeartbeat = useCallback(async () => {
    const bridge = bridgeRef.current;
    const online = bridge ? await bridge.getNetworkConnected() : navigator.onLine;
    if (!online || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 8_000,
      });
    });

    await tripCommsApi.heartbeat(tripId, {
      lat: position?.coords.latitude,
      lng: position?.coords.longitude,
      accuracyMeters: position?.coords.accuracy,
      clientTimestamp: new Date().toISOString(),
      shareLocation: Boolean(position),
    });
  }, [tripId]);

  const loadHistory = useCallback(async (): Promise<IntercomMessage[]> => {
    const bridge = bridgeRef.current;
    const online = bridge ? await bridge.getNetworkConnected() : navigator.onLine;
    if (!online) return [];

    const meta = await getCommsTripMeta(tripId);
    const since = meta.lastKnownServerSeq > 0 ? meta.lastKnownServerSeq : undefined;
    const result = await tripCommsApi.listMessages(tripId, { limit: 50, since });
    if (!result) return [];

    if (result.latestServerSeq > meta.lastKnownServerSeq) {
      await updateCommsTripMeta(tripId, { lastKnownServerSeq: result.latestServerSeq });
    }

    return result.messages.map(apiMessageToUiMessage);
  }, [tripId]);

  const fetchSummary = useCallback(async () => {
    const bridge = bridgeRef.current;
    const online = bridge ? await bridge.getNetworkConnected() : navigator.onLine;
    if (!online) return;

    const result = await tripCommsApi.getSummary(tripId, { maxBullets: 5, lang: 'zh' });
    if (result?.bullets?.length) {
      setApiSummaryLines(result.bullets);
    }
  }, [tripId]);

  const syncOutbox = useCallback(async () => {
    const bridge = bridgeRef.current;
    const online = bridge ? await bridge.getNetworkConnected() : navigator.onLine;
    if (!online) return;

    const pending = await listOutboxMessages(tripId);
    const meta = await getCommsTripMeta(tripId);

    setSyncing(true);
    try {
      const syncPayload = pending.map((msg) =>
        uiMessageToSyncPayload(msg, msg.clientSeq ?? meta.nextClientSeq),
      );

      const result = await tripCommsApi.sync(tripId, {
        messages: syncPayload,
        lastKnownServerSeq: meta.lastKnownServerSeq || undefined,
      });

      if (!result) return;

      for (const clientId of result.syncedIds) {
        await removeOutboxMessage(clientId);
      }

      await updateCommsTripMeta(tripId, { lastKnownServerSeq: result.latestServerSeq });

      await persist((prev) => {
        const syncedClientIds = new Set(result.syncedIds);
        const cleared = prev.map((m) =>
          syncedClientIds.has(m.clientId ?? m.id) ? { ...m, pendingSync: false } : m,
        );
        if (result.serverMessages.length === 0) return cleared;
        const remote = result.serverMessages.map(apiMessageToUiMessage);
        return mergeUiMessages(cleared, remote);
      });
    } finally {
      setSyncing(false);
    }
  }, [persist, tripId]);

  const pushLocalMessage = useCallback(
    async (message: IntercomMessage, options?: { broadcast?: boolean; cloudSync?: boolean }) => {
      await persist((prev) => [...prev, message]);

      const bridge = bridgeRef.current;
      if (options?.broadcast !== false && bridge) {
        const packet = intercomMessageToPacket(tripId, message);
        if (packet) {
          const delivered = await bridge.broadcastPacket(packet);
          if (delivered.length > 0) {
            await persist((prev) =>
              prev.map((m) =>
                m.id === message.id
                  ? { ...m, deliveredCount: delivered.length, peerCount: peers.length }
                  : m,
              ),
            );
          }
        }
      }

      const shouldCloudSync =
        options?.cloudSync !== false && message.senderId !== 'system' && message.kind !== 'system';
      if (shouldCloudSync) {
        await enqueueOutboxMessage(tripId, message);
        const onlineBridge = bridgeRef.current;
        const online = onlineBridge ? await onlineBridge.getNetworkConnected() : navigator.onLine;
        if (online) void syncOutbox();
      }
    },
    [persist, peers.length, syncOutbox, tripId],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let peerTimer: number | undefined;
    let syncTimer: number | undefined;

    (async () => {
      const bridge = await getIntercomNativeBridge();
      if (cancelled) return;
      bridgeRef.current = bridge;

      await bridge.requestBluetoothPermissions();
      await bridge.startSession(tripId);

      const stored = await loadIntercomMessagesAsync(tripId);
      const remoteHistory = await loadHistory();
      const mergedStored =
        remoteHistory.length > 0 ? mergeUiMessages(stored, remoteHistory) : stored;

      const seeded =
        mergedStored.length > 0
          ? mergedStored
          : seedDemoIfEmpty(tripId, rosterPeers, mergedStored);
      if (seeded !== stored) {
        await saveIntercomMessagesAsync(tripId, seeded);
      }
      if (!cancelled) setMessages(seeded);

      unsubscribe = bridge.subscribeIncoming((packet) => {
        if (packet.tripId !== tripId) return;
        const incoming = packetToIntercomMessage(packet);
        if (incoming.kind === 'voice' && incoming.waveform.length === 0) {
          incoming.waveform = buildFakeWaveform(incoming.durationSec * 1000);
        }
        void persist((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
      });

      const online = await bridge.getNetworkConnected();
      if (!cancelled) setIsOnline(online);
      await refreshNativePeers();
      if (online) {
        await refreshApiPeers();
        await sendHeartbeat();
        await fetchSummary();
        void syncOutbox();
      }

      peerTimer = window.setInterval(() => {
        void refreshNativePeers();
        void (async () => {
          const b = bridgeRef.current;
          const netOnline = b ? await b.getNetworkConnected() : navigator.onLine;
          if (!netOnline) return;
          await refreshApiPeers();
          await sendHeartbeat();
        })();
      }, 30_000);

      syncTimer = window.setInterval(() => {
        void syncOutbox();
      }, 60_000);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (peerTimer) window.clearInterval(peerTimer);
      if (syncTimer) window.clearInterval(syncTimer);
      void bridgeRef.current?.stopSession();
    };
  }, [
    open,
    tripId,
    rosterPeers,
    persist,
    refreshNativePeers,
    refreshApiPeers,
    sendHeartbeat,
    fetchSummary,
    loadHistory,
    syncOutbox,
  ]);

  useEffect(() => {
    if (!open) return;

    let networkListener: { remove: () => Promise<void> } | undefined;
    const cleanupFns: Array<() => void> = [];

    void (async () => {
      if (runtime === 'capacitor') {
        try {
          const { Network } = await import('@capacitor/network');
          networkListener = await Network.addListener('networkStatusChange', (status) => {
            setIsOnline(status.connected);
            if (status.connected) void syncOutbox();
          });
          const status = await Network.getStatus();
          setIsOnline(status.connected);
          if (status.connected) void syncOutbox();
        } catch {
          setIsOnline(navigator.onLine);
        }
        return;
      }

      const onOnline = () => {
        setIsOnline(true);
        void syncOutbox();
      };
      const onOffline = () => setIsOnline(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      cleanupFns.push(() => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      });
      setIsOnline(navigator.onLine);
      if (navigator.onLine) void syncOutbox();
    })();

    return () => {
      void networkListener?.remove();
      cleanupFns.forEach((fn) => fn());
    };
  }, [open, runtime, syncOutbox]);

  const sendQuickStatus = useCallback(
    async (status: IntercomQuickStatus) => {
      const clientId = newClientId();
      const clientSeq = await allocateClientSeq(tripId);
      const msg: IntercomMessage = {
        id: clientId,
        clientId,
        clientSeq,
        kind: 'status',
        senderId: currentUserId,
        senderName: currentUserName,
        createdAt: new Date().toISOString(),
        status,
        text: INTERCOM_QUICK_STATUS_LABELS[status],
        pendingSync: !isOnline,
        peerCount: peers.length,
        deliveredCount: Math.max(1, bluetoothConnectedCount - 1),
      };
      await pushLocalMessage(msg);
    },
    [bluetoothConnectedCount, currentUserId, currentUserName, isOnline, peers.length, pushLocalMessage, tripId],
  );

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const clientId = newClientId();
      const clientSeq = await allocateClientSeq(tripId);

      await pushLocalMessage({
        id: clientId,
        clientId,
        clientSeq,
        kind: 'text',
        senderId: currentUserId,
        senderName: currentUserName,
        createdAt: new Date().toISOString(),
        text: trimmed,
        pendingSync: !isOnline,
        peerCount: peers.length,
        deliveredCount: Math.max(1, bluetoothConnectedCount - 1),
      });
      setTextDraft('');
    },
    [bluetoothConnectedCount, currentUserId, currentUserName, isOnline, peers.length, pushLocalMessage, tripId],
  );

  const stopRecording = useCallback(async () => {
    if (recordTimerRef.current != null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    setIsRecording(false);
    const bridge = bridgeRef.current;
    const result = bridge ? await bridge.stopPtt() : { durationSec: Math.max(1, recordingSec) };
    setRecordingSec(0);

    const clientId = newClientId();
    const clientSeq = await allocateClientSeq(tripId);

    await pushLocalMessage({
      id: clientId,
      clientId,
      clientSeq,
      kind: 'voice',
      senderId: currentUserId,
      senderName: currentUserName,
      createdAt: new Date().toISOString(),
      durationSec: result.durationSec,
      transcript: result.durationSec >= 2 ? '语音已记录，转写待同步' : '…',
      waveform: buildFakeWaveform(Date.now()),
      pendingSync: !isOnline,
      peerCount: peers.length,
      deliveredCount: Math.max(1, bluetoothConnectedCount - 1),
    });
  }, [
    bluetoothConnectedCount,
    currentUserId,
    currentUserName,
    isOnline,
    peers.length,
    pushLocalMessage,
    recordingSec,
    tripId,
  ]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordingSec(0);

    recordTimerRef.current = window.setInterval(() => {
      setRecordingSec((s) => s + 1);
    }, 1000);

    await bridgeRef.current?.startPtt();
  }, [isRecording]);

  useEffect(() => {
    if (!isPttLocked || !isRecording) return;
    if (recordingSec >= 30) void stopRecording();
  }, [isPttLocked, isRecording, recordingSec, stopRecording]);

  return {
    peers,
    mission,
    messages,
    aiSummaryLines,
    bluetoothConnectedCount,
    isOnline,
    isRecording,
    isPttLocked,
    recordingSec,
    inputMode,
    textDraft,
    runtime,
    syncing,
    setInputMode,
    setTextDraft,
    setIsPttLocked,
    startRecording,
    stopRecording,
    sendQuickStatus,
    sendText,
    syncOutbox,
  };
}

export type { IntercomMessage, IntercomMission, IntercomPeer };
