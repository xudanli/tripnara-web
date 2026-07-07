import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONDITIONS_FORM,
  hasConditionsFormErrors,
  validateConditionsForm,
} from './conditions-form.util';

describe('validateConditionsForm', () => {
  it('accepts default form', () => {
    const errors = validateConditionsForm(DEFAULT_CONDITIONS_FORM);
    expect(hasConditionsFormErrors(errors)).toBe(false);
  });

  it('rejects end date before start date', () => {
    const errors = validateConditionsForm({
      ...DEFAULT_CONDITIONS_FORM,
      startDate: '2026-09-18',
      endDate: '2026-09-10',
    });
    expect(errors.endDate).toBeTruthy();
  });

  it('rejects budget min greater than max', () => {
    const errors = validateConditionsForm({
      ...DEFAULT_CONDITIONS_FORM,
      budgetMin: 5000,
      budgetMax: 3000,
    });
    expect(errors.budgetMax).toBeTruthy();
  });

  it('rejects adult count out of range', () => {
    const errors = validateConditionsForm({
      ...DEFAULT_CONDITIONS_FORM,
      adultCount: 0,
    });
    expect(errors.adultCount).toBeTruthy();
  });

  it('skips locked fields', () => {
    const errors = validateConditionsForm(
      {
        ...DEFAULT_CONDITIONS_FORM,
        startDate: '2026-09-18',
        endDate: '2026-09-10',
        adultCount: 0,
      },
      ['dateRange', 'travelers'],
    );
    expect(hasConditionsFormErrors(errors)).toBe(false);
  });
});
