import { describe, it, expect } from 'vitest';
import { mapRagUserMessage, isRagDecisionContextError } from '@/lib/rag-error-map';

describe('rag-error-map', () => {
  it('maps decision context enforcement error to user-friendly message', () => {
    expect(
      mapRagUserMessage(
        'rag_requires_decision_context_when_enforcement_on',
        'rag_requires_decision_context_when_enforcement_on'
      )
    ).toContain('决策上下文');
  });

  it('detects decision context errors', () => {
    expect(
      isRagDecisionContextError('rag_requires_decision_context_when_enforcement_on', '')
    ).toBe(true);
    expect(isRagDecisionContextError(undefined, 'missing decision_context')).toBe(true);
  });

  it('falls back to server message for unknown codes', () => {
    expect(mapRagUserMessage('UNKNOWN', '自定义错误')).toBe('自定义错误');
  });
});
