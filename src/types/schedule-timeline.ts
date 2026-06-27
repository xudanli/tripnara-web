import type {
  DayMetricsResponse,
  DayTravelInfoResponse,
  ItineraryItemDetail,
  ScheduleResponse,
  TripDetail,
  TripMetricsResponse,
} from '@/types/trip';

export type ScheduleTimelineInclude = 'items' | 'schedule' | 'metrics' | 'travelInfo';

export type ScheduleTimelineTravelInfoMode = 'cached' | 'none' | 'recalculate';

export interface ScheduleTimelineDay {
  dayId: string;
  date: string;
  dayIndex: number;
  itineraryItems?: ItineraryItemDetail[];
  schedule?: ScheduleResponse | null;
  metrics?: DayMetricsResponse | null;
  travelInfo?: DayTravelInfoResponse | null;
}

/** GET /trips/:id/schedule-timeline 响应 trip 字段（Handoff 0.1.0） */
export type ScheduleTimelineTrip = Pick<
  TripDetail,
  'id' | 'destination' | 'startDate' | 'endDate' | 'pacingConfig' | 'metadata' | 'status'
> & {
  pipelineStatus?: TripDetail['pipelineStatus'] | string | null;
  /** 时间轴修订序号（与 execute metadata.scheduleRevision 对齐） */
  revision?: number;
};

/** GET /trips/:id/schedule-timeline 响应（与后端 schedule-timeline.dto 对齐） */
export interface ScheduleTimelineResponse {
  tripId: string;
  trip: ScheduleTimelineTrip;
  days: ScheduleTimelineDay[];
  metricsSummary?: TripMetricsResponse['summary'];
  etag?: string;
}

export interface GetScheduleTimelineParams {
  /** 逗号分隔或数组，默认 items,schedule,metrics,travelInfo */
  include?: ScheduleTimelineInclude[] | string;
  dates?: string[];
  from?: number;
  limit?: number;
  travelInfoMode?: ScheduleTimelineTravelInfoMode;
  ifNoneMatch?: string;
}

/** GET schedule-timeline 结果（含 304 Not Modified） */
export type ScheduleTimelineFetchResult =
  | { status: 'ok'; data: ScheduleTimelineResponse; etag?: string }
  | { status: 'not_modified'; etag?: string };
