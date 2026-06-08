import type { VerifiedCredentials } from '@/types/match-square';
import {
  MOCK_APPLICANT_WANG,
  MOCK_CAPTAIN_DANNY,
  MOCK_CAPTAIN_LIN,
  MOCK_CAPTAIN_SU,
} from './verified-credentials';
import { CURRENT_USER_ID } from './mock-data';
import { odysseyCredentialsMockStore } from '@/features/odyssey-intake/lib/credentials-mock-store';

const MOCK_BY_USER: Record<string, VerifiedCredentials> = {
  'user-wxy': MOCK_APPLICANT_WANG,
};

/** 队长 userId → credentials（mock 帖 captainUserId） */
const MOCK_CAPTAIN_BY_USER: Record<string, VerifiedCredentials> = {
  'captain-1': MOCK_CAPTAIN_DANNY,
  'captain-2': MOCK_CAPTAIN_LIN,
  'captain-3': MOCK_CAPTAIN_SU,
};

export const userCredentialsMockStore = {
  get: async (
    userId: string,
    ctx?: { postId?: string; displayName?: string; cardTitle?: string; mbtiType?: string }
  ) => {
    if (userId === CURRENT_USER_ID) {
      const self = await odysseyCredentialsMockStore.get();
      return {
        userId,
        cardTitle: ctx?.cardTitle ?? '规划型探索者',
        mbtiType: ctx?.mbtiType ?? 'INTJ',
        credentials: self,
      };
    }

    const captainCreds = MOCK_CAPTAIN_BY_USER[userId];
    if (captainCreds) {
      return {
        userId,
        cardTitle: ctx?.cardTitle ?? '旅行者',
        mbtiType: ctx?.mbtiType ?? '',
        credentials: captainCreds,
      };
    }

    const byName = ctx?.displayName ? MOCK_BY_USER[ctx.displayName] : undefined;
    const credentials = MOCK_BY_USER[userId] ?? byName ?? MOCK_APPLICANT_WANG;

    return {
      userId,
      cardTitle: ctx?.cardTitle ?? credentials.dossier?.displayName ?? '旅行者',
      mbtiType: ctx?.mbtiType ?? '',
      credentials,
    };
  },
};
