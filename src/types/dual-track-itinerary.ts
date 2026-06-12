/** tripnara.dual_track_itinerary@v1 — A 轴默认行程 + B 轴预案分支 */
export interface DualTrackAxisASegment {
  segment_id: string;
  day_date: string;
  label_zh: string;
  item_ids: string[];
}

export type DualTrackTriggerKind =
  | 'contingency_branch'
  | 'rollout_bottleneck'
  | 'weather'
  | 'fatigue'
  | (string & {});

export type DualTrackActivationMode = 'auto' | 'manual' | 'on_confirm' | (string & {});

export interface DualTrackAxisBBranch {
  branch_id: string;
  trigger_kind: DualTrackTriggerKind;
  trigger_label_zh: string;
  trigger_condition: string;
  summary_zh: string;
  expected_utility_ratio?: number;
  activation_mode?: DualTrackActivationMode;
}

export interface DualTrackItineraryPayload {
  schema: 'tripnara.dual_track_itinerary@v1';
  mode: 'dual_track' | 'single_track';
  axis_a_segments: DualTrackAxisASegment[];
  axis_b_branches: DualTrackAxisBBranch[];
  regret_upper_bound?: number;
  headline_zh?: string;
  [key: string]: unknown;
}
