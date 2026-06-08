import type {
  CaptainRadarCandidate,
  CaptainRadarResponse,
  OliveBranchInvitation,
  PatchTravelIntentStatusRequest,
  RecruitmentPostCard,
  RespondOliveBranchRequest,
  SendOliveBranchRequest,
  TravelIntentStatus,
  UpsertTravelIntentRequest,
} from '@/types/match-square';
import { formatDateRangeLabel } from './mock-data';

const INTENT_KEY = 'match-square-travel-intent';
const OLIVE_SENT_KEY = 'match-square-olive-sent';
const OLIVE_INBOX_KEY = 'match-square-olive-inbox';

const MOCK_FREE_AGENTS: Omit<CaptainRadarCandidate, 'oliveBranchSent'>[] = [
  {
    userId: 'user-wxy',
    displayName: '王小野',
    cardTitle: '随性体验者',
    compatibilityPercent: 92,
    departureLabel: '杭州',
    highlights: ['会开车 · 爱拍照', '消费观弹性高', '同处 SP 体验象限'],
    skills: ['驾驶', '摄影'],
  },
  {
    userId: 'user-lin',
    displayName: '林夏',
    cardTitle: '深度松弛派',
    compatibilityPercent: 86,
    departureLabel: '上海',
    highlights: ['不赶路星人', '预算可高可低'],
    skills: ['人文讲解'],
  },
  {
    userId: 'user-zhao',
    displayName: '赵一',
    cardTitle: '规划型探索者',
    compatibilityPercent: 81,
    departureLabel: '南京',
    highlights: ['行程节奏稳定'],
    skills: [],
  },
];

function readIntent(): TravelIntentStatus {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    if (raw) return JSON.parse(raw) as TravelIntentStatus;
  } catch {
    /* ignore */
  }
  return { active: false, updatedAt: null };
}

function writeIntent(status: TravelIntentStatus) {
  localStorage.setItem(INTENT_KEY, JSON.stringify(status));
}

function readOliveSent(postId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${OLIVE_SENT_KEY}:${postId}`);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function writeOliveSent(postId: string, ids: Set<string>) {
  localStorage.setItem(`${OLIVE_SENT_KEY}:${postId}`, JSON.stringify([...ids]));
}

function delay<T>(v: T, ms = 240): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

export const travelIntentMockStore = {
  get: (): Promise<TravelIntentStatus> => delay(readIntent()),

  upsert: (body: UpsertTravelIntentRequest): Promise<TravelIntentStatus> => {
    const prev = readIntent();
    const next: TravelIntentStatus = {
      ...prev,
      destinationScope: body.destinationScope,
      destinationHint: body.destinationScope,
      startDate: body.startDate,
      endDate: body.endDate,
      dateRangeLabel: formatDateRangeLabel(body.startDate, body.endDate),
      budgetFlex: body.budgetFlex ?? prev.budgetFlex ?? prev.budgetFlexibility,
      budgetFlexibility: body.budgetFlex ?? prev.budgetFlexibility,
      openToCarpool: body.openToCarpool ?? prev.openToCarpool,
      note: body.note ?? prev.note,
      updatedAt: new Date().toISOString(),
    };
    writeIntent(next);
    return delay(next);
  },

  patchStatus: (body: PatchTravelIntentStatusRequest): Promise<TravelIntentStatus> => {
    const active =
      body.status === 'active' || (body.status == null && body.active === true);
    const next: TravelIntentStatus = {
      ...readIntent(),
      active,
      updatedAt: new Date().toISOString(),
    };
    writeIntent(next);
    return delay(next);
  },

  listInvitations: (): Promise<OliveBranchInvitation[]> => {
    try {
      const raw = localStorage.getItem(OLIVE_INBOX_KEY);
      if (raw) {
        return delay(JSON.parse(raw) as OliveBranchInvitation[]);
      }
    } catch {
      /* ignore */
    }
    return delay([]);
  },

  respondInvitation: (
    invitationId: string,
    body: RespondOliveBranchRequest
  ): Promise<OliveBranchInvitation> => {
    const items = JSON.parse(
      localStorage.getItem(OLIVE_INBOX_KEY) ?? '[]'
    ) as OliveBranchInvitation[];
    const idx = items.findIndex((i) => i.id === invitationId);
    if (idx < 0) throw new Error('NOT_FOUND');
    items[idx] = {
      ...items[idx],
      status: body.action === 'accept' ? 'accepted' : 'declined',
    };
    localStorage.setItem(OLIVE_INBOX_KEY, JSON.stringify(items));
    return delay(items[idx]);
  },
};

export const captainRadarMockStore = {
  getCandidates: (post: RecruitmentPostCard): Promise<CaptainRadarResponse> => {
    const sent = readOliveSent(post.id);
    const dest = post.destination.toLowerCase();
    const candidates = MOCK_FREE_AGENTS.filter((c) => {
      if (c.compatibilityPercent < 85) return false;
      if (dest.includes('西北') || dest.includes('新疆') || dest.includes('青甘')) return true;
      return c.compatibilityPercent >= 88;
    }).map((c) => ({
      ...c,
      oliveBranchSent: sent.has(c.userId),
    }));

    return delay({
      postId: post.id,
      candidates,
      picks: candidates,
      total: candidates.length,
      systemHint:
        candidates.length > 0
          ? `系统发现 ${candidates.length} 位挂起意向的高契合旅伴，可投递橄榄枝`
          : null,
    });
  },

  sendOliveBranch: (
    postId: string,
    body: SendOliveBranchRequest
  ): Promise<void> => {
    const sent = readOliveSent(postId);
    const userId = body.inviteeUserId ?? body.candidateUserId;
    if (userId) sent.add(userId);
    writeOliveSent(postId, sent);
    return delay(undefined);
  },
};
