import { describe, expect, it } from 'vitest';
import { isCtreCompileNotFoundSignal } from './client';

describe('isCtreCompileNotFoundSignal', () => {
  it('matches backend No CTRE compilation message', () => {
    expect(
      isCtreCompileNotFoundSignal(
        'No CTRE compilation for trip 55951f8a-e08a-4f15-9d15-a56ff0684a1d',
      ),
    ).toBe(true);
  });

  it('matches error codes', () => {
    expect(isCtreCompileNotFoundSignal({ code: 'NO_CTE_COMPILATION' })).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(isCtreCompileNotFoundSignal({ message: 'Internal server error' })).toBe(false);
  });
});
