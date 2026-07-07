export type TripFileCategory =
  | 'booking'
  | 'travel'
  | 'insurance'
  | 'receipts'
  | 'visa'
  | 'team';

export type TripFileStatus = 'UPLOADED' | 'PENDING' | 'EXPIRED';

/** overview 聚合项额外状态 */
export type TripFileOverviewStatus = TripFileStatus | 'REFERENCE' | 'LINK';

export type TripFileSource =
  | 'trip_file'
  | 'itinerary_booking'
  | 'itinerary_link'
  | 'itinerary_pending';

export interface TripFileItem {
  id: string;
  tripId: string;
  category: TripFileCategory | string;
  status: TripFileStatus;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number;
  title: string | null;
  description: string | null;
  expiresAt: string | null;
  itineraryItemId: string | null;
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripFileListResponse {
  items: TripFileItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TripFileCategoryStats {
  id: string;
  title: string;
  description: string;
  count: number;
}

export interface TripFileStatsResponse {
  totalCount: number;
  uploadedCount: number;
  pendingCount: number;
  expiringSoonCount: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  categories: TripFileCategoryStats[];
}

export interface TripFileDownloadResponse {
  fileId: string;
  fileName: string;
  mimeType: string | null;
  downloadUrl: string;
  expiresAt: string;
}

export interface CreateTripFilePendingRequest {
  category: TripFileCategory | string;
  title?: string;
  description?: string;
  expiresAt?: string;
  itineraryItemId?: string;
}

export interface TripFileListQuery {
  category?: string;
  status?: TripFileStatus;
  limit?: number;
  offset?: number;
}

export interface TripFileOverviewQuery {
  category?: string;
  status?: TripFileOverviewStatus | string;
  source?: TripFileSource | string;
  limit?: number;
  offset?: number;
  includePending?: boolean;
}

/** 方案 A 聚合项：trip_files + 行程项预订资料 */
export interface TripFileOverviewItem {
  id: string;
  source: TripFileSource;
  tripId?: string;
  category: TripFileCategory | string;
  status: TripFileOverviewStatus;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number;
  title?: string | null;
  description?: string | null;
  expiresAt?: string | null;
  itineraryItemId?: string | null;
  itineraryItemTitle?: string | null;
  uploadedByUserId?: string;
  /** 外链（itinerary_link / 部分 REFERENCE） */
  url?: string | null;
  referenceText?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TripFileOverviewSources {
  tripFileCount: number;
  itineraryDocumentCount: number;
  itineraryPendingCount: number;
  itineraryLinkCount: number;
}

export interface TripFileOverviewResponse {
  tripId: string;
  stats: TripFileStatsResponse;
  items: TripFileOverviewItem[];
  total: number;
  limit: number;
  offset: number;
  sources: TripFileOverviewSources;
  generatedAt: string;
}
