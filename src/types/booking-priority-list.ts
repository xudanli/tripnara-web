/** tripnara.booking_priority_list@v1 — 抢票倒计时、日历提醒、官方链接 */
export type BookingPriorityCategory =
  | 'ATTRACTION_TICKET'
  | 'TRANSPORT_FLIGHT'
  | 'SPECIAL_EXPERIENCE'
  | (string & {});

export type BookingPriorityUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | (string & {});

export interface BookingPriorityTiming {
  book_by_date: string;
  opens_at_local?: string;
  /** 相对 generated_at 的秒数，用于本地重算倒计时 */
  countdown_seconds: number;
}

export interface BookingPriorityActionPayload {
  official_booking_url: string;
  booking_guide_html?: string;
  calendar_reminder_deeplink: string;
}

export interface BookingPriorityItem {
  id: string;
  category: BookingPriorityCategory;
  title: string;
  associated_day_number: number;
  urgency_level: BookingPriorityUrgency;
  timing: BookingPriorityTiming;
  action_payload: BookingPriorityActionPayload;
}

export interface BookingPriorityListPayload {
  schema: 'tripnara.booking_priority_list@v1';
  trip_id: string;
  generated_at: string;
  items: BookingPriorityItem[];
  [key: string]: unknown;
}

export function isBookingPriorityList(v: unknown): v is BookingPriorityListPayload {
  return (
    typeof v === 'object' &&
    v != null &&
    (v as BookingPriorityListPayload).schema === 'tripnara.booking_priority_list@v1' &&
    Array.isArray((v as BookingPriorityListPayload).items)
  );
}
