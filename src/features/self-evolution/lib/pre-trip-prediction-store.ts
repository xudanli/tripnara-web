const STORAGE_KEY = 'tripnara:pre-trip-predictions';

interface PreTripPredictionEntry {
  postId: string;
  applicationId: string;
  prediction: number;
  dimensionPredictions?: Record<string, number>;
  recordedAt: string;
}

function readAll(): PreTripPredictionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PreTripPredictionEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: PreTripPredictionEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** 招募匹配完成时记录 pre-trip 预测，供旅行结束后的校准闭环使用 */
export function recordPreTripPrediction(
  postId: string,
  applicationId: string,
  prediction: number,
  dimensionPredictions?: Record<string, number>
) {
  const entries = readAll().filter((e) => e.applicationId !== applicationId);
  entries.push({
    postId,
    applicationId,
    prediction,
    dimensionPredictions,
    recordedAt: new Date().toISOString(),
  });
  writeAll(entries);
}

export function getPreTripPrediction(applicationId: string): PreTripPredictionEntry | undefined {
  return readAll().find((e) => e.applicationId === applicationId);
}

export function clearPreTripPrediction(applicationId: string) {
  writeAll(readAll().filter((e) => e.applicationId !== applicationId));
}
