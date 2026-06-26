import type { CalibrationRecordRequest, ColdStartConfig } from '@/types/self-evolution';

function mirrorField(
  body: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
  value: unknown
): void {
  body[camelKey] = value;
  body[snakeKey] = value;
}

/** POST /match-square/calibration — 与后端 DTO 对齐（camel + snake 双写） */
export function serializeCalibrationRecordRequest(
  data: CalibrationRecordRequest
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  mirrorField(body, 'postId', 'post_id', data.postId);
  mirrorField(body, 'applicationId', 'application_id', data.applicationId);
  mirrorField(body, 'preTripPrediction', 'pre_trip_prediction', data.preTripPrediction);
  mirrorField(body, 'postTripSatisfaction', 'post_trip_satisfaction', data.postTripSatisfaction);

  if (data.tripId) {
    mirrorField(body, 'tripId', 'trip_id', data.tripId);
  }
  if (data.dimensionPredictions) {
    mirrorField(body, 'dimensionPredictions', 'dimension_predictions', data.dimensionPredictions);
  }
  if (data.dimensionSatisfactions) {
    mirrorField(body, 'dimensionSatisfactions', 'dimension_satisfactions', data.dimensionSatisfactions);
  }

  return body;
}

export function serializeCalibrationRecordBatch(
  requests: CalibrationRecordRequest[]
): Record<string, unknown>[] {
  return requests.map(serializeCalibrationRecordRequest);
}

/** POST /match-square/calibration/config */
export function serializeColdStartConfig(
  config: Partial<ColdStartConfig>
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (config.questionnaireThreshold != null) {
    mirrorField(
      body,
      'questionnaireThreshold',
      'questionnaire_threshold',
      config.questionnaireThreshold
    );
  }
  if (config.heuristicThreshold != null) {
    mirrorField(body, 'heuristicThreshold', 'heuristic_threshold', config.heuristicThreshold);
  }
  if (config.offlineShapleyThreshold != null) {
    mirrorField(
      body,
      'offlineShapleyThreshold',
      'offline_shapley_threshold',
      config.offlineShapleyThreshold
    );
  }
  if (config.realtimeCalibrationThreshold != null) {
    mirrorField(
      body,
      'realtimeCalibrationThreshold',
      'realtime_calibration_threshold',
      config.realtimeCalibrationThreshold
    );
  }

  return body;
}
