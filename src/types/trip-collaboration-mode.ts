/**
 * 行程协作模式 — 与后端 TripAdvisorCreateService 对齐
 * advisor-create 写入 metadata.tripCollaborationMode = TRIP_COLLABORATION_MODE_ADVISOR_LED
 */

/** 与后端 `TRIP_COLLABORATION_MODE_ADVISOR_LED` 同值 */
export const TRIP_COLLABORATION_MODE_ADVISOR_LED = 'advisor_led' as const;

/** 用户自由行多人协作（决策画像 / 私密想法 / 领域协商） */
export const TRIP_COLLABORATION_MODE_SELF_PLANNED = 'self_planned' as const;

export type TripCollaborationMode =
  | typeof TRIP_COLLABORATION_MODE_ADVISOR_LED
  | typeof TRIP_COLLABORATION_MODE_SELF_PLANNED
  | string;

export function isAdvisorLedCollaborationMode(
  mode: unknown,
): mode is typeof TRIP_COLLABORATION_MODE_ADVISOR_LED {
  return (
    mode === TRIP_COLLABORATION_MODE_ADVISOR_LED ||
    mode === 'ADVISOR_LED'
  );
}

export function readTripCollaborationMode(
  metadata: Record<string, unknown> | null | undefined,
): TripCollaborationMode | undefined {
  if (!metadata) return undefined;
  const mode = metadata.tripCollaborationMode ?? metadata.trip_collaboration_mode;
  return typeof mode === 'string' && mode.trim() ? mode.trim() : undefined;
}
