import { describe, expect, it } from 'vitest';
import {
  deriveDayAnchorsFromRouteLine,
  samplePointsAlongLine,
  snapPointToPolyline,
} from './route-line-anchors.util';

describe('route-line-anchors.util', () => {
  const ringLine: [number, number][] = [
    [-21.94, 64.15],
    [-19.0, 63.42],
    [-16.18, 64.05],
    [-14.4, 65.26],
    [-18.11, 65.68],
    [-21.94, 64.15],
  ];

  it('samples evenly along a polyline', () => {
    const samples = samplePointsAlongLine(ringLine, 3);
    expect(samples).toHaveLength(3);
    expect(samples[0]).toEqual(ringLine[0]);
    expect(samples[2]).toEqual(ringLine[ringLine.length - 1]);
  });

  it('snaps an off-route point onto the polyline', () => {
    const snapped = snapPointToPolyline([-19.5, 62.0], ringLine);
    expect(snapped[1]).toBeGreaterThan(63);
  });

  it('derives anchors on the line for days with missing map points', () => {
    const anchors = deriveDayAnchorsFromRouteLine(ringLine, [
      { day: 1, mapPoint: { lng: -21.94, lat: 64.15 } },
      { day: 2 },
      { day: 3, mapPoint: { lng: 0, lat: 0 } },
    ]);

    expect(anchors).toHaveLength(3);
    for (const anchor of anchors) {
      const onLine = snapPointToPolyline([anchor.lng, anchor.lat], ringLine);
      expect(onLine[0]).toBeCloseTo(anchor.lng, 2);
      expect(onLine[1]).toBeCloseTo(anchor.lat, 2);
    }
  });

  it('rejects map points too far from the route line', () => {
    const anchors = deriveDayAnchorsFromRouteLine(ringLine, [
      { day: 1, mapPoint: { lng: -21.94, lat: 64.15 } },
      { day: 2, mapPoint: { lng: 10, lat: 64 } },
    ]);

    expect(anchors).toHaveLength(2);
    const day2OnLine = snapPointToPolyline([anchors[1]!.lng, anchors[1]!.lat], ringLine);
    expect(day2OnLine[0]).toBeCloseTo(anchors[1]!.lng, 2);
  });
});
