import type { OdysseyProfileCardUi, OdysseyTripIntentOption } from '@/types/odyssey-intake';

export const DEFAULT_TRIP_INTENT_OPTIONS: OdysseyTripIntentOption[] = [
  { id: 'open_to_match', label: '开放匹配' },
  { id: 'solo_focus', label: '独行专注' },
  { id: 'budget_mode', label: '穷游模式' },
  { id: 'luxury_splurge', label: '品质优先' },
  { id: 'slow_travel', label: '慢旅行' },
  { id: 'intensive_pace', label: '特种兵节奏' },
];

export const DEFAULT_PROFILE_CARD_UI: OdysseyProfileCardUi = {
  placement: 'profile_header_third',
  showShimmerRefresh: false,
  gyroscopeEnabled: true,
  cta: { label: '调整本次出行状态', action: 'trip_intent' },
  tripIntentTagOptions: DEFAULT_TRIP_INTENT_OPTIONS,
};
