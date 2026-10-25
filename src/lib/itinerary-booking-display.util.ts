import type { BookingStatus } from '@/types/trip';

export const BOOKING_STATUS_LABELS: Record<
  BookingStatus,
  { label: string; color: string; icon: string }
> = {
  BOOKED: { label: '已预订', color: 'bg-muted text-success border-border', icon: '✅' },
  NEED_BOOKING: { label: '待预订', color: 'bg-muted text-warning border-border', icon: '📅' },
  NO_BOOKING: { label: '无需预订', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: '✓' },
};
