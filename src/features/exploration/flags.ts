/** Exploration Consumer MVP feature flags — 对齐 frontend-routes-scaffold §6 */

const truthy = (v: string | undefined) => v === '1' || v === 'true';

const travelContextEnabled =
  import.meta.env.VITE_TRAVEL_CONTEXT_ENABLED === '0' ||
  import.meta.env.VITE_TRAVEL_CONTEXT_ENABLED === 'false'
    ? false
    : truthy(import.meta.env.VITE_TRAVEL_CONTEXT_ENABLED) ||
      truthy(import.meta.env.VITE_DECISION_GATEWAY_UNIFIED);

export const explorationFlags = {
  explorationEnabled:
    truthy(import.meta.env.VITE_EXPLORATION_CONSUMER_MVP_ENABLED) ||
    import.meta.env.VITE_EXPLORATION_CONSUMER_MVP_ENABLED === undefined,
  /** RFC-003 Travel Context — 与 DECISION_GATEWAY_UNIFIED 对齐，可 VITE_TRAVEL_CONTEXT_ENABLED=0 关闭 */
  travelContextEnabled,
  /** Phase 5 — 多 Tab SSE revision 增量刷新；VITE_TRAVEL_CONTEXT_SSE=0 关闭 */
  travelContextRevisionEvents:
    import.meta.env.VITE_TRAVEL_CONTEXT_SSE === '0' ||
    import.meta.env.VITE_TRAVEL_CONTEXT_SSE === 'false'
      ? false
      : truthy(import.meta.env.VITE_TRAVEL_CONTEXT_SSE) || travelContextEnabled,
  hubCardTellAi:
    import.meta.env.VITE_HUB_EXPLORE_CARD_ENABLED !== '0' &&
    import.meta.env.VITE_HUB_EXPLORE_CARD_ENABLED !== 'false',
  /** 用户自行配置条件后再 POST /scenarios（不传 researchProtocolId） */
  userConfigurableConditions: truthy(import.meta.env.VITE_EXPLORATION_USER_CONDITIONS),
  /** 冰岛研究：protocol 锁定条件，条件页只读 */
  researchMode:
    truthy(import.meta.env.VITE_EXPLORATION_RESEARCH_MODE) &&
    !truthy(import.meta.env.VITE_EXPLORATION_USER_CONDITIONS),
} as const;
