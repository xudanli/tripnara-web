import { describe, expect, it } from 'vitest';
import {
  normalizeTripExportApiPath,
  parseContentDispositionFilename,
} from './trip-pdf-export.util';

describe('parseContentDispositionFilename', () => {
  it('prefers UTF-8 filename*', () => {
    const header =
      'attachment; filename="trip.pdf"; filename*=UTF-8\'\'%E5%86%B0%E5%B2%9B%202026-08-03.pdf';
    expect(parseContentDispositionFilename(header)).toBe('冰岛 2026-08-03.pdf');
  });

  it('falls back to quoted filename', () => {
    expect(parseContentDispositionFilename('attachment; filename="trip.pdf"')).toBe('trip.pdf');
  });

  it('returns null for empty', () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
    expect(parseContentDispositionFilename('')).toBeNull();
  });
});

describe('normalizeTripExportApiPath', () => {
  it('strips /api prefix once', () => {
    expect(normalizeTripExportApiPath('/api/trips/abc/export/pdf')).toBe(
      '/trips/abc/export/pdf',
    );
    expect(normalizeTripExportApiPath('/trips/abc/export/pdf')).toBe('/trips/abc/export/pdf');
  });
});
