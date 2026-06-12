/** tripnara.accommodation_health@v1 — N 晚进度条 + 人话标签（不展示 raw km） */
export type AccommodationHealthSchema = 'tripnara.accommodation_health@v1';

export type AccommodationNightStatus = 'booked' | 'missing' | 'warning' | 'critical';

export interface AccommodationHealthNight {
  night_index: number;
  date_label_zh?: string;
  label_zh?: string;
  status: AccommodationNightStatus;
  /** 人话标签，如「疑似定错城市」 */
  warning_badge_zh?: string;
  /** 已换算为「约 X 小时车程」 */
  driving_time_label_zh?: string;
  cta_label_zh?: string;
  [key: string]: unknown;
}

export interface AccommodationHealthPayload {
  schema: AccommodationHealthSchema;
  nights: AccommodationHealthNight[];
  summary_zh?: string;
  [key: string]: unknown;
}

export function isAccommodationHealthPayload(v: unknown): v is AccommodationHealthPayload {
  return (
    typeof v === 'object' &&
    v != null &&
    (v as AccommodationHealthPayload).schema === 'tripnara.accommodation_health@v1' &&
    Array.isArray((v as AccommodationHealthPayload).nights)
  );
}
