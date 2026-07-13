import { describe, expect, it } from 'vitest';
import {
  buildItineraryItemNoteForSave,
  buildTepItemNote,
  parseTepItemNoteForForm,
} from '@/lib/tep-item-note.util';

describe('tep-item-note.util', () => {
  it('builds JSON note with _tep namespace', () => {
    const note = buildTepItemNote({
      userNote: '黑沙滩停留',
      importance: 'OPTIONAL',
      flexibility: 'REMOVABLE',
    });
    const parsed = JSON.parse(note) as { userNote?: string; _tep?: Record<string, unknown> };
    expect(parsed.userNote).toBe('黑沙滩停留');
    expect(parsed._tep?.importance).toBe('OPTIONAL');
    expect(parsed._tep?.flexibility).toBe('REMOVABLE');
  });

  it('parses existing JSON note for form', () => {
    const note = buildTepItemNote({
      userNote: '测试',
      importance: 'MANDATORY',
      flexibility: 'FIXED',
    });
    const form = parseTepItemNoteForForm(note);
    expect(form.userNote).toBe('测试');
    expect(form.tep.importance).toBe('MANDATORY');
  });

  it('preserves plain user note when tep disabled', () => {
    const saved = buildItineraryItemNoteForSave({
      userNote: '普通备注',
      displayRole: 'normal',
      tepEnabled: false,
    });
    expect(saved).toBe('普通备注');
  });
});
