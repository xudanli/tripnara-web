/** ItineraryItem.note JSON — `_tep` 命名空间（P1 写入） */

export const TEP_NOTE_VERSION = '1.0' as const;

export type TepImportance = 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
export type TepFlexibility = 'FIXED' | 'MOVABLE' | 'REPLACEABLE' | 'REMOVABLE';

export interface ItineraryItemTepNamespace {
  schemaVersion: typeof TEP_NOTE_VERSION;
  importance?: TepImportance;
  flexibility?: TepFlexibility;
  weatherSensitive?: boolean;
  weatherFallbackPoiId?: string;
  latestArrival?: string;
  routeSegmentId?: string;
  mustDo?: boolean;
}

export interface ItineraryItemNoteJson {
  userNote?: string;
  _tep?: ItineraryItemTepNamespace;
}

/** 用户向弹性预设 */
export type TepFlexibilityPreset =
  | 'mandatory_fixed'
  | 'mandatory_movable'
  | 'recommended_removable'
  | 'optional_replaceable'
  | 'custom';

export type DriverExperienceLevel = 'NOVICE_ABROAD' | 'INTERMEDIATE' | 'EXPERIENCED';

export type SelfDriveVehicleType = '2WD' | '4WD' | 'AWD' | 'CAMPERVAN';

/** PUT /trips/{id} metadata 片段 */
export interface PutTripSelfDriveMetadata {
  metadata: {
    vehicleDeclaredByUser?: boolean;
    driverExperienceLevel?: DriverExperienceLevel;
    constraints?: {
      vehicle_type?: SelfDriveVehicleType;
      noNightDrive?: { enabled?: boolean; maxMinutesAfterSunset?: number };
      maxDailyDriveMinutes?: number;
    };
  };
}
