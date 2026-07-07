import { describe, expect, it } from 'vitest';
import { resolveDecisionSpaceProblemTemplate } from './decision-space-problem-template.util';

describe('decision-space-problem-template.util', () => {
  it('detects reservation template from poi_access issue', () => {
    const view = resolveDecisionSpaceProblemTemplate({
      conflict: {
        issue: { issueKind: 'poi_access_reservation_required', title: '蓝湖' },
      } as never,
      problem: { title: '蓝湖温泉：需要预约' } as never,
    });
    expect(view.kind).toBe('reservation');
    expect(view.supportsReservationEvidence).toBe(true);
  });

  it('detects daily load template', () => {
    const view = resolveDecisionSpaceProblemTemplate({
      problem: {
        semanticKey: 'EXCESSIVE_DAILY_LOAD',
        title: '第5天驾驶负荷过高',
      } as never,
    });
    expect(view.kind).toBe('daily_load');
  });

  it('detects route template from transport conflict', () => {
    const view = resolveDecisionSpaceProblemTemplate({
      conflict: { category: 'transport', title: '路段不可达' } as never,
    });
    expect(view.kind).toBe('route');
  });
});
